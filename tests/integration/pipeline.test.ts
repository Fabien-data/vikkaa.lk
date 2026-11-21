import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, type Asset } from '@/db/schema';
import {
  advanceEngagement,
  advanceAsset,
  markSigned,
  markPaid,
  missingForLive,
  InvalidTransitionError,
} from '@/server/pipeline';

async function seed(assetOver: Partial<typeof assets.$inferInsert> = {}) {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'N', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({ engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 100, ...assetOver })
    .returning();
  return { e, a };
}
const stageOf = async (id: string) => (await db.select().from(engagements).where(eq(engagements.id, id)))[0];
const assetOf = async (id: string) => (await db.select().from(assets).where(eq(assets.id, id)))[0];
const photo = { src: '/media/x-1600.webp', srcSet: 'x' };

describe('pipeline', () => {
  it('moves forward through early stages', async () => {
    const { e } = await seed();
    await advanceEngagement(e.id, 'call');
    await advanceEngagement(e.id, 'visit');
    await advanceEngagement(e.id, 'proposal');
    expect((await stageOf(e.id)).stage).toBe('proposal');
  });

  it('refuses backwards moves and proposal → signed by hand', async () => {
    const { e } = await seed();
    await advanceEngagement(e.id, 'proposal');
    await expect(advanceEngagement(e.id, 'signed')).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(advanceEngagement(e.id, 'call')).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('no_go requires a reason, stores the price read, and can be reopened', async () => {
    const { e } = await seed();
    await expect(advanceEngagement(e.id, 'no_go')).rejects.toBeInstanceOf(InvalidTransitionError);
    await advanceEngagement(e.id, 'no_go', { reason: 'Overpriced', priceRead: 'Rs 60M' });
    const s = await stageOf(e.id);
    expect(s.stage).toBe('no_go');
    expect(s.noGoReason).toBe('Overpriced');
    expect(s.priceRead).toBe('Rs 60M');
    await advanceEngagement(e.id, 'intake');
    expect((await stageOf(e.id)).stage).toBe('intake');
  });

  it('signed + paid moves draft assets to production; either alone does not', async () => {
    const one = await seed();
    await markSigned(one.e.id, new Date('2026-12-01T00:00:00Z'));
    expect((await assetOf(one.a.id)).status).toBe('draft');
    await markPaid(one.e.id, new Date('2026-12-02T00:00:00Z'));
    expect((await assetOf(one.a.id)).status).toBe('production');

    const two = await seed();
    await markPaid(two.e.id, new Date());
    expect((await assetOf(two.a.id)).status).toBe('draft');
  });

  it('markSigned sets endsAt from exclusiveDays', async () => {
    const { e } = await seed();
    await markSigned(e.id, new Date('2026-12-01T00:00:00Z'));
    const s = await stageOf(e.id);
    expect(s.stage).toBe('signed');
    expect(s.endsAt!.toISOString()).toBe('2027-03-01T00:00:00.000Z');
  });

  it('asset cannot go live without a photo, title, description and price', async () => {
    const { a } = await seed({ status: 'production' });
    expect(missingForLive(a as Asset)).toEqual(['description', 'photos']);
    await expect(advanceAsset(a.id, 'live')).rejects.toThrow(/photos/);
  });

  it('going live sets publishedAt', async () => {
    const { a } = await seed({ status: 'production', description: 'Nice', photos: [photo] });
    await advanceAsset(a.id, 'live');
    const live = await assetOf(a.id);
    expect(live.status).toBe('live');
    expect(live.publishedAt).toBeInstanceOf(Date);
  });

  it('moves between live and under offer, and expires', async () => {
    const { a } = await seed({ status: 'live', description: 'x', photos: [photo] });
    await advanceAsset(a.id, 'under_offer');
    await advanceAsset(a.id, 'live');
    await advanceAsset(a.id, 'expired');
    expect((await assetOf(a.id)).status).toBe('expired');
  });

  it('sold requires a price; sold cannot be withdrawn', async () => {
    const { a } = await seed({ status: 'under_offer', description: 'x', photos: [photo] });
    await expect(advanceAsset(a.id, 'sold')).rejects.toBeInstanceOf(InvalidTransitionError);
    await advanceAsset(a.id, 'sold', { soldPriceCents: 6_500_000_000 });
    const sold = await assetOf(a.id);
    expect(sold.status).toBe('sold');
    expect(sold.soldPriceCents).toBe(6_500_000_000);
    expect(sold.soldAt).toBeInstanceOf(Date);
    await expect(advanceAsset(a.id, 'withdrawn')).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('draft cannot jump to live', async () => {
    const { a } = await seed({ description: 'x', photos: [photo] });
    await expect(advanceAsset(a.id, 'live')).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});
