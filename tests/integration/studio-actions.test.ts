import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, areaPrices } from '@/db/schema';

const requireStaff = vi.fn();
vi.mock('@/server/auth-guard', () => ({ requireStaff: () => requireStaff() }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { saveEngagement, recalculateFit, markNoGo } from '@/app/console/studio/(staff)/engagements/actions';

async function seed() {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Nimal', phone: '+94771234567' }).returning();
  const [e] = await db
    .insert(engagements)
    .values({
      clientId: c.id,
      type: 'single',
      commissionRateBp: 300,
      exclusiveDays: 90,
      followOnMonths: 6,
      intakeAnswers: { timeline: '0-3m', documents: 'clean', ownersAgree: true, exclusiveOk: true, inWesternProvince: true },
    })
    .returning();
  await db.insert(assets).values({
    engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: 'house-x1', district: 'Colombo', area: 'Nugegoda', askingPriceCents: 6_850_000_000,
  });
  return e;
}

const form = (o: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

describe('studio actions', () => {
  beforeEach(() => {
    requireStaff.mockReset();
    requireStaff.mockResolvedValue({ userId: 'u1', organizationId: 'org_vikkaa' });
  });

  it('actions refuse without a staff session', async () => {
    requireStaff.mockRejectedValue(new Error('REDIRECT:/login'));
    const e = await seed();
    await expect(recalculateFit(e.id)).rejects.toThrow('REDIRECT:/login');
    await expect(saveEngagement(undefined, form({ id: e.id }))).rejects.toThrow('REDIRECT:/login');
  });

  it('saveEngagement stores rupees as cents and percent as basis points', async () => {
    const e = await seed();
    const r = await saveEngagement(
      undefined,
      form({ id: e.id, upfrontFeeRupees: '75,000', adBudgetRupees: '50000', commissionPercent: '2.5', exclusiveDays: '60', followOnMonths: '6', commissionApplies: 'on', contentPlan: 'Drone + film', marketNotes: '' }),
    );
    expect(r).toEqual({ ok: true });
    const [saved] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(saved.upfrontFeeCents).toBe(7_500_000);
    expect(saved.adBudgetCents).toBe(5_000_000);
    expect(saved.commissionRateBp).toBe(250);
    expect(saved.exclusiveDays).toBe(60);
    expect(saved.contentPlan).toBe('Drone + film');
  });

  it('saveEngagement rejects a bad amount with a message', async () => {
    const e = await seed();
    const r = await saveEngagement(undefined, form({ id: e.id, upfrontFeeRupees: 'abc', adBudgetRupees: '0', commissionPercent: '3', exclusiveDays: '90', followOnMonths: '6' }));
    expect(r).toEqual({ error: 'Upfront fee: enter an amount in rupees' });
  });

  it('recalculateFit updates score after adding an area price', async () => {
    const e = await seed();
    await recalculateFit(e.id);
    const [before] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(before.fitScore).toBe(87);
    await db.insert(areaPrices).values({ kind: 'house', area: 'Nugegoda', lowCents: 6_000_000_000, highCents: 7_000_000_000, source: 'x' });
    await recalculateFit(e.id);
    const [after] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(after.fitScore).toBe(100);
    expect(after.fitFlags).toEqual([]);
  });

  it('markNoGo returns a wa.me link with the price read', async () => {
    const e = await seed();
    const r = await markNoGo(e.id, 'Overpriced, seller firm', 'Similar houses sell for Rs 60–70M.');
    expect(r.whatsapp).toBe(
      `https://wa.me/94771234567?text=${encodeURIComponent('Similar houses sell for Rs 60–70M.')}`,
    );
    const [saved] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(saved.stage).toBe('no_go');
    expect(saved.noGoReason).toBe('Overpriced, seller firm');
  });
});
