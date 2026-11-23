import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { messages, user } from '@/db/schema';
import { verifySignedPath } from '@/lib/signed-url';

const sendEmail = vi.fn<(input: unknown) => Promise<{ id: string }>>(async () => ({ id: 'resend-1' }));
vi.mock('@/server/email', () => ({ sendEmail: (input: unknown) => sendEmail(input) }));

import { sendTrackedEmail, unsubscribeUrl, whatsappDraft } from '@/server/messaging';
import { saveSettings } from '@/server/settings';
import { recordOutreachBasis, withdrawAll } from '@/server/consent';
import { templateVars } from '@/server/prospects';
import { render } from '@/server/templates';

const IN_HOURS = new Date('2026-11-23T05:00:00Z'); // 10:30 in Colombo
const LATE = new Date('2026-11-23T15:00:00Z'); // 20:30 in Colombo

async function founder() {
  const [u] = await db.insert(user).values({ id: crypto.randomUUID(), name: 'Tiran', email: `t-${crypto.randomUUID()}@vikkaa.test` }).returning();
  return { id: u.id, name: u.name, email: u.email };
}
const mail = (over: Partial<Parameters<typeof sendTrackedEmail>[0]> = {}) => ({
  to: 'owner@dealer.lk',
  subject: 'Hello',
  body: 'Body',
  purpose: 'outreach' as const,
  now: IN_HOURS,
  ...over,
});

describe('messaging', () => {
  beforeEach(async () => {
    sendEmail.mockClear();
    for (const c of ['owner@dealer.lk', 'a@x.lk', 'b@x.lk', 'c@x.lk', '+94771234567']) await recordOutreachBasis(c, 'asked_in_person', { at: new Date('2026-11-01') });
  });

  it('outreach without a recorded basis is blocked and leaves no row, so the same step can send once a basis exists', async () => {
    expect(await sendTrackedEmail(mail({ to: 'new@dealer.lk', dedupeKey: 'outreach:p1:0' }))).toMatchObject({ status: 'blocked', reason: 'No contact basis recorded' });
    expect(await db.select().from(messages)).toHaveLength(0);
    expect(await whatsappDraft('0779990000', 'Hi', 'outreach')).toBeNull();
    await recordOutreachBasis('new@dealer.lk', 'inbound_request');
    expect(await sendTrackedEmail(mail({ to: 'new@dealer.lk', dedupeKey: 'outreach:p1:0' }))).toMatchObject({ status: 'sent' });
  });

  it('sends outreach with an unsubscribe link and header, from the founder, and logs it', async () => {
    const f = await founder();
    const r = await sendTrackedEmail(mail({ fromUser: f }));
    expect(r.status).toBe('sent');
    const sent = sendEmail.mock.calls[0][0] as { text: string; headers: Record<string, string>; fromName: string; replyTo: string };
    expect(sent.text).toMatch(/No more emails from Vikkaa\? http/);
    expect(sent.headers['List-Unsubscribe']).toMatch(/^<http.*\/unsubscribe\//);
    expect(sent.fromName).toBe('Tiran at Vikkaa');
    expect(sent.replyTo).toBe(f.email);
    const [row] = await db.select().from(messages);
    expect([row.status, row.providerId, row.toAddress]).toEqual(['sent', 'resend-1', 'owner@dealer.lk']);
  });

  it('transactional mail has no unsubscribe footer', async () => {
    await sendTrackedEmail(mail({ purpose: 'transactional', now: LATE }));
    expect((sendEmail.mock.calls[0][0] as { text: string }).text).toBe('Body');
  });

  it('respects quiet hours for outreach only', async () => {
    expect(await sendTrackedEmail(mail({ now: LATE }))).toMatchObject({ status: 'blocked', reason: expect.stringMatching(/sending hours/) });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('blocks contacts who asked to stop and records why', async () => {
    await withdrawAll('owner@dealer.lk', 'test');
    expect(await sendTrackedEmail(mail())).toMatchObject({ status: 'blocked' });
    const [row] = await db.select().from(messages);
    expect(row.status).toBe('blocked');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('caps outreach per founder per day', async () => {
    await saveSettings('messaging', { perSenderDailyCap: 2 });
    const f = await founder();
    for (const to of ['a@x.lk', 'b@x.lk']) expect((await sendTrackedEmail(mail({ to, fromUser: f }))).status).toBe('sent');
    expect(await sendTrackedEmail(mail({ to: 'c@x.lk', fromUser: f }))).toMatchObject({ status: 'blocked', reason: expect.stringMatching(/2 outreach emails/) });
  });

  it('keeps a daily reserve for transactional mail', async () => {
    await saveSettings('messaging', { emailDailyCap: 4, transactionalReserve: 2 });
    for (const to of ['a@x.lk', 'b@x.lk']) expect((await sendTrackedEmail(mail({ to }))).status).toBe('sent');
    expect((await sendTrackedEmail(mail({ to: 'c@x.lk' }))).status).toBe('blocked');
    expect((await sendTrackedEmail(mail({ to: 'c@x.lk', purpose: 'transactional' }))).status).toBe('sent');
  });

  it('a dedupe key sends at most once', async () => {
    await sendTrackedEmail(mail({ purpose: 'transactional', dedupeKey: 'k1' }));
    expect(await sendTrackedEmail(mail({ purpose: 'transactional', dedupeKey: 'k1' }))).toMatchObject({ status: 'blocked', reason: 'Already sent' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('a failed provider call is logged as failed', async () => {
    sendEmail.mockRejectedValueOnce(new Error('Resend down'));
    expect(await sendTrackedEmail(mail())).toMatchObject({ status: 'failed', reason: 'Resend down' });
    const [row] = await db.select().from(messages);
    expect([row.status, row.lastError]).toEqual(['failed', 'Resend down']);
  });

  it('unsubscribe links are signed and verify', () => {
    const url = new URL(unsubscribeUrl('msg-1'));
    expect(verifySignedPath('/unsubscribe/msg-1', url.searchParams)).toBe('ok');
    expect(verifySignedPath('/unsubscribe/msg-2', url.searchParams)).toBe('invalid');
  });

  it('WhatsApp drafts add a STOP line and respect withdrawals', async () => {
    const link = await whatsappDraft('0771234567', 'Hi', 'outreach');
    expect(link).toMatch(/^https:\/\/wa\.me\/94771234567\?text=/);
    expect(decodeURIComponent(link!)).toMatch(/Reply STOP/);
    await withdrawAll('+94771234567', 'test');
    expect(await whatsappDraft('0771234567', 'Hi', 'outreach')).toBeNull();
  });

  it('template variables fill from the prospect', () => {
    const vars = templateVars({ name: 'Lanka Auto', contactName: 'Sunil Silva', area: 'Nugegoda', district: null, pitchToken: 'tok' } as never, 'Tiran');
    expect(render('Hi {firstName}, {founderName} for {company} in {area}: {pitchLink}', vars)).toMatch(/^Hi Sunil, Tiran for Lanka Auto in Nugegoda: http.*\/for\/tok$/);
  });

  it('a failed send frees its dedupe key, so the next attempt goes through', async () => {
    sendEmail.mockRejectedValueOnce(new Error('timeout'));
    expect(await sendTrackedEmail(mail({ purpose: 'transactional', dedupeKey: 'inv-1' }))).toMatchObject({ status: 'failed' });
    expect(await sendTrackedEmail(mail({ purpose: 'transactional', dedupeKey: 'inv-1' }))).toMatchObject({ status: 'sent' });
    expect(await sendTrackedEmail(mail({ purpose: 'transactional', dedupeKey: 'inv-1' }))).toMatchObject({ status: 'blocked', reason: 'Already sent' });
  });
});
