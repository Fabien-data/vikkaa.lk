import { and, asc, eq, isNotNull, min, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { engagements, packages, signatories, type Package } from '@/db/schema';
import { getSettings } from '@/server/settings';

/** A price-book problem staff can fix. */
export class PackageError extends Error {}

export async function listPackages(opts: { activeOnly?: boolean } = {}): Promise<Package[]> {
  return db
    .select()
    .from(packages)
    .where(opts.activeOnly ? eq(packages.active, true) : undefined)
    .orderBy(asc(packages.sortOrder), asc(packages.priceCents));
}

export type PackageInput = Omit<typeof packages.$inferInsert, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;

export async function savePackage(input: PackageInput, id?: string): Promise<Package> {
  if (!input.name.trim()) throw new PackageError('Give the package a name');
  if (!(input.priceCents > 0) && !input.founding) throw new PackageError('Set a price (only founding packages can be free)');
  if (input.kind === 'retainer' && !(input.unitsPerMonth && input.unitsPerMonth > 0)) throw new PackageError('A retainer needs the number of units a month');
  if (id) {
    const [p] = await db.update(packages).set(input).where(eq(packages.id, id)).returning();
    if (!p) throw new PackageError('That package no longer exists');
    return p;
  }
  const [p] = await db.insert(packages).values(input).returning();
  return p;
}

/**
 * Copies a package's terms onto an engagement. Terms are a snapshot: editing the price book later
 * never changes a quote. Refused once anyone has signed, and founding packages respect the cap.
 */
export async function applyPackage(engagementId: string, packageId: string): Promise<void> {
  const [pkg] = await db.select().from(packages).where(eq(packages.id, packageId));
  if (!pkg || !pkg.active) throw new PackageError('That package is not available');
  const [e] = await db.select().from(engagements).where(eq(engagements.id, engagementId));
  if (!e) throw new PackageError('Engagement not found');
  const signed = await db
    .select({ id: signatories.id })
    .from(signatories)
    .where(and(eq(signatories.engagementId, engagementId), isNotNull(signatories.signedAt)))
    .limit(1);
  if (signed.length || e.signedAt) throw new PackageError('Terms are locked because the agreement has been signed.');

  if (pkg.founding && !e.foundingTerms) {
    const { limits } = await getSettings();
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(engagements)
      .where(and(eq(engagements.foundingTerms, true), ne(engagements.stage, 'no_go'), ne(engagements.id, engagementId)));
    if (n >= limits.foundingCap) throw new PackageError(`Founding terms are capped at ${limits.foundingCap} clients, and that many are already taken.`);
  }

  const retainer = pkg.kind === 'retainer';
  await db
    .update(engagements)
    .set({
      packageId: pkg.id,
      foundingTerms: pkg.founding,
      agreementKind: pkg.kind === 'retainer' ? 'retainer' : pkg.kind === 'pilot' ? 'pilot' : pkg.founding ? 'founding' : 'seller_exclusive',
      upfrontFeeCents: retainer ? 0 : pkg.priceCents,
      monthlyFeeCents: retainer ? pkg.priceCents : 0,
      unitsPerMonth: pkg.unitsPerMonth,
      billingDay: retainer ? (e.billingDay ?? 1) : null,
      exclusiveDays: pkg.exclusiveDays ?? e.exclusiveDays,
      followOnMonths: pkg.followOnMonths ?? e.followOnMonths,
      commissionRateBp: pkg.commissionBp ?? e.commissionRateBp,
      commissionApplies: pkg.commissionBp === 0 ? false : pkg.commissionBp ? true : e.commissionApplies,
      commissionMinCents: pkg.commissionMinCents,
    })
    .where(eq(engagements.id, engagementId));
}

/** The public "campaigns from Rs X" figures: the cheapest active package marked for the guide, per category. */
export async function priceGuide(): Promise<{ propertyCents: number; vehicleCents: number }> {
  const rows = await db
    .select({ category: packages.category, from: min(packages.priceCents) })
    .from(packages)
    .where(and(eq(packages.active, true), eq(packages.publicFrom, true)))
    .groupBy(packages.category);
  const of = (c: 'property' | 'vehicle') => Number(rows.find((r) => r.category === c)?.from ?? 0);
  return { propertyCents: of('property'), vehicleCents: of('vehicle') };
}
