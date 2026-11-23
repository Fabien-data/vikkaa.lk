import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, clients, documents, engagements, messages, tasks } from '@/db/schema';

const sendEmail = vi.fn<(input: unknown) => Promise<{ id: string }>>(async () => ({ id: 'r' }));
vi.mock('@/server/email', () => ({ sendEmail: (i: unknown) => sendEmail(i) }));
vi.mock('@/server/sms', () => ({ sendSms: vi.fn(async () => {}) }));

import { tick, lastTick } from '@/server/ticker';
import { issueRetainerInvoice } from '@/server/billing';

async function retainer() {
  const [c] = await db.insert(clients).values({ type: 'dealer', name: 'Lanka Auto', phone: '+94112345678', email: 'owner@lankaauto.lk' }).returning();
  const [e] = await db
    .insert(engagements)
    .values({ clientId: c.id, type: 'retainer', stage: 'signed', commissionRateBp: 150, exclusiveDays: 90, followOnMonths: 6, monthlyFeeCents: 15_000_000, unitsPerMonth: 8, billingDay: 5, signedAt: new Date('2026-11-10T05:00:00Z') })
    .returning();
  return { c, e };
}
const emailsTo = (to: string) => sendEmail.mock.calls.map((c) => c[0] as { to: string; subject: string }).filter((m) => m.to === to);

describe('ticker', () => {
  beforeEach(() => sendEmail.mockClear());

  it('bills retainers on their billing day, once, and emails the client', async () => {
    const { e } = await retainer();
    await tick(new Date('2026-12-04T05:00:00Z')); // day 4: too early
    expect(await db.select().from(documents)).toHaveLength(0);
    await tick(new Date('2026-12-05T05:00:00Z'));
    await tick(new Date('2026-12-05T05:01:00Z'));
    const docs = await db.select().from(documents).where(eq(documents.engagementId, e.id));
    expect(docs).toHaveLength(1);
    expect(emailsTo('owner@lankaauto.lk').filter((m) => /invoice/.test(m.subject))).toHaveLength(1);
    expect(lastTick()?.toISOString()).toBe('2026-12-05T05:01:00.000Z');
  });

  it('reminds at 3 and 7 days overdue, with one call task at 7 days', async () => {
    const { e } = await retainer();
    await issueRetainerInvoice(e.id, '2026-12', new Date('2026-12-05T03:00:00Z')); // due 2026-12-12
    sendEmail.mockClear();
    await tick(new Date('2026-12-14T05:00:00Z')); // 2 days overdue
    expect(emailsTo('owner@lankaauto.lk').filter((m) => /Reminder/.test(m.subject))).toHaveLength(0);
    await tick(new Date('2026-12-15T05:00:00Z'));
    await tick(new Date('2026-12-16T05:00:00Z'));
    expect(emailsTo('owner@lankaauto.lk').filter((m) => /Reminder/.test(m.subject))).toHaveLength(1);
    await tick(new Date('2026-12-19T05:00:00Z'));
    await tick(new Date('2026-12-20T05:00:00Z'));
    expect(emailsTo('owner@lankaauto.lk').filter((m) => /Reminder/.test(m.subject))).toHaveLength(2);
    expect(await db.select().from(tasks)).toHaveLength(1);
  });

  it('sends the morning brief once a day after 07:30', async () => {
    await tick(new Date('2026-12-01T01:00:00Z')); // 06:30 Colombo
    expect(sendEmail.mock.calls.filter((c) => /Vikkaa today/.test((c[0] as { subject: string }).subject))).toHaveLength(0);
    await tick(new Date('2026-12-01T02:05:00Z')); // 07:35
    await tick(new Date('2026-12-01T03:00:00Z'));
    const briefs = sendEmail.mock.calls.filter((c) => /Vikkaa today/.test((c[0] as { subject: string }).subject));
    expect(briefs.length).toBeGreaterThan(0);
    const perAddress = new Set(briefs.map((c) => (c[0] as { to: string }).to));
    expect(briefs.length).toBe(perAddress.size);
  });

  it('sends queued messages, retries failures, and never re-sends a stuck one', async () => {
    const now = new Date('2026-12-01T05:00:00Z');
    await db.insert(messages).values([
      { channel: 'email', purpose: 'transactional', status: 'queued', toAddress: 'a@x.lk', subject: 'Hi', body: 'Body' },
      { channel: 'email', purpose: 'transactional', status: 'sending', toAddress: 'b@x.lk', sentAt: new Date(now.getTime() - 20 * 60_000) },
    ]);
    sendEmail.mockRejectedValueOnce(new Error('down'));
    await tick(now);
    let rows = await db.select().from(messages);
    expect(rows.find((r) => r.toAddress === 'a@x.lk')?.status).toBe('queued');
    expect(rows.find((r) => r.toAddress === 'b@x.lk')?.status).toBe('failed');
    await tick(new Date(now.getTime() + 5 * 60_000));
    rows = await db.select().from(messages);
    expect(rows.find((r) => r.toAddress === 'a@x.lk')?.status).toBe('sent');
  });

  it('a failing sweep does not stop the others', async () => {
    const [c] = await db.insert(clients).values({ type: 'private', name: 'X', phone: '+94770009999' }).returning();
    const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', stage: 'signed', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6, signedAt: new Date('2026-08-01T00:00:00Z'), endsAt: new Date('2026-10-30T00:00:00Z') }).returning();
    await db.insert(assets).values({ engagementId: e.id, category: 'property', kind: 'house', title: 'H', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'X', askingPriceCents: 1, status: 'live' });
    await tick(new Date('2026-12-01T05:00:00Z'));
    expect((await db.select().from(assets))[0].status).toBe('expired');
  });
});
