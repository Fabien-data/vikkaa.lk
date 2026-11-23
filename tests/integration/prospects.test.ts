import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, prospects, user, documents, messages } from '@/db/schema';

const sendEmail = vi.fn<(input: unknown) => Promise<{ id: string }>>(async () => ({ id: 'resend-1' }));
vi.mock('@/server/email', () => ({ sendEmail: (input: unknown) => sendEmail(input) }));

import {
  convertToClient,
  currentStep,
  logTouch,
  markDoNotContact,
  markWhatsappSent,
  quickAdd,
  sendAllDue,
  sendStepEmail,
  setStatus,
  todayQueue,
  ProspectError,
} from '@/server/prospects';
import { savePackage } from '@/server/packages';
import { saveSettings } from '@/server/settings';
import { submitSellerIntake, sellerIntakeSchema } from '@/server/seller-intake';
import { weekNumbers, gates } from '@/server/war-room';

const DAY = 86_400_000;
const T0 = new Date('2026-11-23T05:00:00Z'); // Monday 10:30 Colombo

async function founder(name = 'Tiran') {
  const [u] = await db.insert(user).values({ id: crypto.randomUUID(), name, email: `${name}-${crypto.randomUUID()}@vikkaa.test` }).returning();
  return u.id;
}
const load = async (id: string) => (await db.select().from(prospects).where(eq(prospects.id, id)))[0];

describe('prospects', () => {
  beforeEach(() => sendEmail.mockClear());

  it('quick add normalises the phone, is due now, and refuses a duplicate phone', async () => {
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '077 123 4567' }, T0);
    expect(p.phone).toBe('+94771234567');
    expect(p.nextActionAt?.getTime()).toBe(T0.getTime());
    await expect(quickAdd({ name: 'Other', segment: 'dealer', phone: '+94771234567' })).rejects.toThrow(/Already on your list: Lanka Auto/);
    await expect(quickAdd({ name: 'No contact', segment: 'dealer' })).rejects.toThrow(ProspectError);
  });

  it('runs the four-step cadence: email, WhatsApp, call, email', async () => {
    const me = await founder();
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '0771234567', email: 'owner@lankaauto.lk', ownerUserId: me }, T0);

    expect(await sendStepEmail(p.id, me, T0)).toMatchObject({ status: 'sent' });
    let row = await load(p.id);
    expect([row.status, row.cadenceStep]).toEqual(['contacted', 1]);
    expect(row.nextActionAt!.getTime()).toBe(T0.getTime() + 2 * DAY);
    expect((sendEmail.mock.calls[0][0] as { subject: string }).subject).toBe('Moving Lanka Auto stock faster');

    const t2 = new Date(T0.getTime() + 2 * DAY);
    await markWhatsappSent(p.id, me, t2);
    row = await load(p.id);
    expect(row.cadenceStep).toBe(2);
    expect(row.nextActionAt!.getTime()).toBe(t2.getTime() + 2 * DAY);

    const t3 = new Date(t2.getTime() + 2 * DAY);
    await logTouch(p.id, { channel: 'call', outcome: 'no_answer' }, me, t3);
    row = await load(p.id);
    expect(row.cadenceStep).toBe(3);
    expect(row.nextActionAt!.getTime()).toBe(t3.getTime() + 4 * DAY);

    await sendStepEmail(p.id, me, new Date(t3.getTime() + 4 * DAY));
    row = await load(p.id);
    expect(row.nextActionAt).toBeNull();
    expect(currentStep(row)).toBeNull();
  });

  it('skips channels it has no address for', async () => {
    const p = await quickAdd({ name: 'Phone only', segment: 'developer', phone: '0779999999' }, T0);
    expect(currentStep(p)?.step.channel).toBe('whatsapp');
  });

  it('extra touches are logged without moving the cadence; a reply stops it and "contacted" resumes it', async () => {
    const me = await founder();
    const p = await quickAdd({ name: 'Dev Co', segment: 'developer', phone: '0778888888', email: 'a@dev.lk' }, T0);
    await logTouch(p.id, { channel: 'visit', outcome: 'pitched' }, me, T0);
    let row = await load(p.id);
    expect([row.status, row.cadenceStep]).toEqual(['contacted', 0]);
    await setStatus(p.id, 'replied', { now: T0 });
    row = await load(p.id);
    expect(row.nextActionAt).toBeNull();
    await setStatus(p.id, 'contacted', { now: T0 });
    expect((await load(p.id)).nextActionAt?.getTime()).toBe(T0.getTime());
  });

  it("today's queue holds my due prospects and unassigned ones, with a filled WhatsApp link", async () => {
    const me = await founder();
    const other = await founder('Partner');
    await quickAdd({ name: 'Mine', segment: 'dealer', phone: '0771111111', ownerUserId: me }, T0);
    await quickAdd({ name: 'Unassigned', segment: 'dealer', email: 'x@y.lk' }, T0);
    await quickAdd({ name: 'Theirs', segment: 'dealer', phone: '0772222222', ownerUserId: other }, T0);
    await quickAdd({ name: 'Later', segment: 'dealer', phone: '0773333333', ownerUserId: me }, new Date(T0.getTime() + 5 * DAY));
    const q = await todayQueue(me, T0);
    expect(q.map((i) => i.prospect.name).sort()).toEqual(['Mine', 'Unassigned']);
    const mine = q.find((i) => i.prospect.name === 'Mine')!;
    expect(mine.step.channel).toBe('whatsapp');
    expect(mine.whatsapp?.link).toMatch(/wa\.me\/94771111111/);
    expect(q.find((i) => i.prospect.name === 'Unassigned')?.email?.subject).toMatch(/Unassigned/);
  });

  it('send all due stops at a daily limit so nothing is half-sent', async () => {
    await saveSettings('messaging', { perSenderDailyCap: 1 });
    const me = await founder();
    const a = await quickAdd({ name: 'A', segment: 'dealer', email: 'a@a.lk' }, T0);
    const b = await quickAdd({ name: 'B', segment: 'dealer', email: 'b@b.lk' }, T0);
    const c = await quickAdd({ name: 'C', segment: 'dealer', email: 'c@c.lk' }, T0);
    const r = await sendAllDue([a.id, b.id, c.id], me, T0);
    expect(r.sent).toBe(1);
    expect(r.problems).toHaveLength(1);
    expect((await load(b.id)).cadenceStep).toBe(0);
  });

  it('do not contact withdraws every channel and closes the prospect', async () => {
    const me = await founder();
    const p = await quickAdd({ name: 'Stop', segment: 'dealer', phone: '0774444444', email: 's@s.lk' }, T0);
    await markDoNotContact(p.id, me, T0);
    const row = await load(p.id);
    expect([row.status, row.lostReason]).toEqual(['lost', 'Asked not to be contacted']);
    expect(await sendStepEmail(p.id, me, T0)).toMatchObject({ status: 'blocked' });
  });

  it('converts to a client with a retainer engagement and the package terms, entered once', async () => {
    const pkg = await savePackage({ name: 'Dealer 8', segment: 'dealer', category: 'vehicle', kind: 'retainer', priceCents: 15_000_000, unitsPerMonth: 8 });
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '0771234567', email: 'o@la.lk' }, T0);
    const { clientId, engagementId } = await convertToClient(p.id, { packageId: pkg.id });
    const [c] = await db.select().from(clients).where(eq(clients.id, clientId));
    const [e] = await db.select().from(engagements).where(eq(engagements.id, engagementId));
    expect([c.type, c.phone, c.source]).toEqual(['dealer', '+94771234567', 'prospect:dealer']);
    expect([e.type, e.stage, e.monthlyFeeCents, e.unitsPerMonth]).toEqual(['retainer', 'call', 15_000_000, 8]);
    expect((await load(p.id)).status).toBe('won');
    await expect(convertToClient((await quickAdd({ name: 'Email only', segment: 'private', email: 'e@e.lk' })).id)).rejects.toThrow(/phone/);
  });

  it('a seller form with a prospect phone links the two', async () => {
    const p = await quickAdd({ name: 'Nimal Perera', segment: 'private', phone: '0771234567' }, T0);
    const parsed = sellerIntakeSchema.parse({
      name: 'Nimal Perera', phone: '0771234567', email: '', clientType: 'private', category: 'property', kind: 'house', district: 'Colombo',
      area: 'Nugegoda', askingPriceRupees: '68,500,000', timeline: '0-3m', documents: 'clean', ownersAgree: 'yes', exclusiveOk: 'yes', bedrooms: '4', website: '',
    });
    await submitSellerIntake(parsed);
    const row = await load(p.id);
    expect(row.clientId).not.toBeNull();
    expect(row.status).toBe('won');
  });
});

describe('outreach safety', () => {
  it('two simultaneous sends of the same step send one email', async () => {
    const me = await founder();
    const p = await quickAdd({ name: 'Double Click Motors', segment: 'dealer', email: 'd@d.lk' }, T0);
    sendEmail.mockClear();
    const results = await Promise.all([sendStepEmail(p.id, me, T0), sendStepEmail(p.id, me, T0)]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.status === 'sent')).toHaveLength(1);
  });
});

describe('war room', () => {
  it('counts contacts and pitches this week', async () => {
    const me = await founder();
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '0771234567' }, T0);
    await logTouch(p.id, { channel: 'visit', outcome: 'pitched' }, me, T0);
    await logTouch(p.id, { channel: 'call', outcome: 'no_answer' }, me, T0);
    const w = await weekNumbers(new Date(T0.getTime() + DAY));
    expect([w.contacted, w.pitches]).toEqual([1, 1]);
    expect(await db.select().from(messages)).toHaveLength(2);
  });

  it('gate B is met by a dealer with a paid invoice', async () => {
    const [c] = await db.insert(clients).values({ type: 'dealer', name: 'Lanka Auto', phone: '+94771234567' }).returning();
    const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'retainer', commissionRateBp: 150, exclusiveDays: 90, followOnMonths: 6 }).returning();
    const extra = { lawyerApproved: false, mrrCents: 0, dealsAgreed: 0 };
    expect((await gates(T0, extra)).find((g) => g.key === 'B')?.status).toBe('open');
    await db.insert(documents).values({ engagementId: e.id, type: 'invoice', storageKey: 'k', sha256: 'x'.repeat(64), totalCents: 100, paidAt: T0 });
    expect((await gates(T0, extra)).find((g) => g.key === 'B')?.status).toBe('met');
    expect((await gates(new Date('2027-02-15T00:00:00Z'), { ...extra })).find((g) => g.key === 'A')?.status).toBe('missed');
  });
});
