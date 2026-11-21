import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, buyers, evidenceEntries, user } from '@/db/schema';

const requireStaff = vi.fn();
vi.mock('@/server/auth-guard', () => ({ requireStaff: () => requireStaff() }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { appendEvidence, verifyEvidenceChain } from '@/server/evidence-log';
import { upsertBuyerByPhone } from '@/server/buyers';
import { submitCheckin } from '@/app/console/checkin/[assetId]/actions';

async function seed(category: 'property' | 'vehicle' = 'property') {
  await db.insert(user).values({ id: 'u1', name: 'Staff', email: 'staff@vikkaa.test', emailVerified: true }).onConflictDoNothing();
  const [c] = await db.insert(clients).values({ type: 'private', name: 'N', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({ engagementId: e.id, category, kind: category === 'vehicle' ? 'car' : 'house', title: 'X', slug: `x-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 1 })
    .returning();
  const b = await upsertBuyerByPhone('+94771234567', { name: 'Kamal' });
  return { a, b };
}

const entry = (assetId: string, buyerId: string, over: Partial<Parameters<typeof appendEvidence>[0]> = {}) =>
  appendEvidence({ assetId, buyerId, type: 'contact', channel: 'phone', happenedAt: new Date(), ...over });

function form(o: Record<string, string>) {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

describe('evidence log', () => {
  beforeEach(() => requireStaff.mockResolvedValue({ userId: 'u1', organizationId: 'org_vikkaa' }));

  it('chains entries and the chain verifies', async () => {
    const { a, b } = await seed();
    const first = await entry(a.id, b.id, { type: 'first_contact', channel: 'web_form', data: { enquiryId: 'q1' } });
    const second = await entry(a.id, b.id, { type: 'viewing', channel: 'in_person' });
    expect(first.prevHash).toBe('0'.repeat(64));
    expect(second.prevHash).toBe(first.hash);
    expect(await verifyEvidenceChain('org_vikkaa')).toBe(true);
  });

  it('raw SQL tampering breaks verification', async () => {
    const { a, b } = await seed();
    await entry(a.id, b.id);
    await entry(a.id, b.id, { type: 'offer', data: { offerCents: 100 } });
    await db.execute(sql`alter table evidence_entries disable trigger evidence_entries_append_only`);
    await db.execute(sql`update evidence_entries set channel = 'email' where type = 'contact'`);
    await db.execute(sql`alter table evidence_entries enable trigger evidence_entries_append_only`);
    expect(await verifyEvidenceChain('org_vikkaa')).toBe(false);
  });

  it('the database blocks UPDATE', async () => {
    const { a, b } = await seed();
    const e = await entry(a.id, b.id);
    await expect(db.update(evidenceEntries).set({ channel: 'email' }).where(eq(evidenceEntries.id, e.id))).rejects.toThrow();
  });

  it('the database blocks DELETE', async () => {
    const { a, b } = await seed();
    const e = await entry(a.id, b.id);
    await expect(db.delete(evidenceEntries).where(eq(evidenceEntries.id, e.id))).rejects.toThrow();
  });

  it('rejects a future happenedAt and accepts a backdated one with recordedAt now', async () => {
    const { a, b } = await seed();
    await expect(entry(a.id, b.id, { happenedAt: new Date(Date.now() + 10 * 60_000) })).rejects.toThrow(/future/);
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const e = await entry(a.id, b.id, { happenedAt: threeDaysAgo });
    expect(e.happenedAt.getTime()).toBe(threeDaysAgo.getTime());
    expect(Math.abs(e.recordedAt.getTime() - Date.now())).toBeLessThan(5_000);
  });

  it('a correction requires the original entry', async () => {
    const { a, b } = await seed();
    await expect(entry(a.id, b.id, { type: 'correction' })).rejects.toThrow(/correct/);
    const original = await entry(a.id, b.id);
    const fix = await entry(a.id, b.id, { type: 'correction', correctsEntryId: original.id, data: { notes: 'Was WhatsApp' } });
    expect(fix.correctsEntryId).toBe(original.id);
  });

  it('upsert never overwrites with blank and keeps first consent', async () => {
    const first = new Date('2026-11-01T00:00:00Z');
    await upsertBuyerByPhone('+94770001111', { name: 'Nimal', privacyAcceptedAt: first });
    const b = await upsertBuyerByPhone('+94770001111', { name: '', email: 'n@x.lk', privacyAcceptedAt: new Date() });
    expect(b.name).toBe('Nimal');
    expect(b.email).toBe('n@x.lk');
    expect(b.privacyAcceptedAt!.getTime()).toBe(first.getTime());
    expect(await db.$count(buyers)).toBe(1);
  });

  it('check-in requires confirmation', async () => {
    const { a } = await seed();
    const r = await submitCheckin(undefined, form({ assetId: a.id, name: 'Sunil', phone: '0712223334', nic: '123456789V' }));
    expect(r?.error).toMatch(/confirm/i);
  });

  it('check-in logs viewing for property and test_drive for vehicle', async () => {
    const house = await seed('property');
    const car = await seed('vehicle');
    const ok = { name: 'Sunil', phone: '0712223334', nic: '123456789V', confirmIntroduced: 'on' };
    expect(await submitCheckin(undefined, form({ assetId: house.a.id, ...ok }))).toEqual({ ok: true });
    expect(await submitCheckin(undefined, form({ assetId: car.a.id, ...ok }))).toEqual({ ok: true });
    const types = (await db.select().from(evidenceEntries)).map((e) => [e.assetId, e.type, e.channel]);
    expect(types).toContainEqual([house.a.id, 'viewing', 'in_person']);
    expect(types).toContainEqual([car.a.id, 'test_drive', 'in_person']);
    const [sunil] = await db.select().from(buyers).where(eq(buyers.phone, '+94712223334'));
    expect(sunil.nic).toBe('123456789V');
  });

  it('check-in entry data holds no personal fields', async () => {
    const { a } = await seed();
    await submitCheckin(undefined, form({ assetId: a.id, name: 'Sunil', phone: '0712223334', nic: '123456789V', confirmIntroduced: 'on' }));
    const [e] = await db.select().from(evidenceEntries);
    expect(e.data).toEqual({ checkin: true, confirmedIntroduced: true });
  });
});
