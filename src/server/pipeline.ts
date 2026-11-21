import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, engagements, type Asset } from '@/db/schema';
import type { AssetStatus, EngagementStage } from '@/lib/enums';

export class InvalidTransitionError extends Error {}

const EARLY: EngagementStage[] = ['intake', 'call', 'visit', 'proposal'];
const DAY_MS = 86_400_000;

async function loadEngagement(id: string) {
  const [e] = await db.select().from(engagements).where(eq(engagements.id, id));
  if (!e) throw new InvalidTransitionError('Engagement not found');
  return e;
}

/** Manual stage moves. Signing only happens through markSigned. */
export async function advanceEngagement(
  id: string,
  to: EngagementStage,
  data: { reason?: string; priceRead?: string } = {},
): Promise<void> {
  const e = await loadEngagement(id);
  const from = e.stage;

  if (EARLY.includes(from) && EARLY.includes(to) && EARLY.indexOf(to) > EARLY.indexOf(from)) {
    await db.update(engagements).set({ stage: to }).where(eq(engagements.id, id));
    return;
  }
  if (EARLY.includes(from) && to === 'no_go') {
    if (!data.reason?.trim()) throw new InvalidTransitionError('A reason is required to mark an engagement as not going ahead');
    await db
      .update(engagements)
      .set({ stage: 'no_go', noGoReason: data.reason.trim(), priceRead: data.priceRead?.trim() || null })
      .where(eq(engagements.id, id));
    return;
  }
  if (from === 'no_go' && to === 'intake') {
    await db.update(engagements).set({ stage: 'intake' }).where(eq(engagements.id, id));
    return;
  }
  throw new InvalidTransitionError(`Cannot move an engagement from ${from} to ${to}`);
}

/** Signs a proposal once. The conditional update means a second call can never move the exclusive-period dates. */
export async function markSigned(engagementId: string, at: Date): Promise<void> {
  const e = await loadEngagement(engagementId);
  const updated = await db
    .update(engagements)
    .set({ stage: 'signed', signedAt: at, endsAt: new Date(at.getTime() + e.exclusiveDays * DAY_MS) })
    .where(and(eq(engagements.id, engagementId), eq(engagements.stage, 'proposal'), isNull(engagements.signedAt)))
    .returning({ id: engagements.id });
  if (!updated.length) throw new InvalidTransitionError(`Only an unsigned proposal can be signed (this one is ${e.stage})`);
  await syncProduction(engagementId);
}

export async function markPaid(engagementId: string, at: Date): Promise<void> {
  await db.update(engagements).set({ paidAt: at }).where(eq(engagements.id, engagementId));
  await syncProduction(engagementId);
}

/** Once an engagement is both signed and paid, its draft assets move into production. */
export async function syncProduction(engagementId: string): Promise<void> {
  const e = await loadEngagement(engagementId);
  if (!e.signedAt || !e.paidAt) return;
  await db
    .update(assets)
    .set({ status: 'production' })
    .where(and(eq(assets.engagementId, engagementId), eq(assets.status, 'draft')));
}

export function missingForLive(asset: Asset): string[] {
  const missing: string[] = [];
  if (!asset.title?.trim()) missing.push('title');
  if (!asset.description?.trim()) missing.push('description');
  if (!asset.askingPriceCents) missing.push('askingPriceCents');
  if (!asset.photos?.length) missing.push('photos');
  return missing;
}

const ASSET_MOVES: Partial<Record<AssetStatus, AssetStatus[]>> = {
  production: ['live', 'withdrawn'],
  live: ['under_offer', 'sold', 'expired', 'withdrawn'],
  under_offer: ['live', 'sold', 'expired', 'withdrawn'],
  draft: ['withdrawn'],
  expired: ['withdrawn'],
};

export async function advanceAsset(id: string, to: AssetStatus, data: { soldPriceCents?: number } = {}): Promise<void> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  if (!asset) throw new InvalidTransitionError('Asset not found');
  if (!ASSET_MOVES[asset.status]?.includes(to)) {
    throw new InvalidTransitionError(`Cannot move an asset from ${asset.status} to ${to}`);
  }

  if (to === 'live' && asset.status === 'production') {
    const missing = missingForLive(asset);
    if (missing.length) throw new InvalidTransitionError(`Cannot go live yet, missing: ${missing.join(', ')}`);
    await db.update(assets).set({ status: 'live', publishedAt: asset.publishedAt ?? new Date() }).where(eq(assets.id, id));
    return;
  }
  if (to === 'sold') {
    if (!data.soldPriceCents || data.soldPriceCents <= 0) throw new InvalidTransitionError('A sold price is required');
    await db.update(assets).set({ status: 'sold', soldPriceCents: data.soldPriceCents, soldAt: new Date() }).where(eq(assets.id, id));
    return;
  }
  await db.update(assets).set({ status: to }).where(eq(assets.id, id));
}
