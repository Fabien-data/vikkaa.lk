import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { areaPrices, type Asset } from '@/db/schema';
import type { PriceRange } from '@/server/fit-scorer';

const ieq = (column: Parameters<typeof sql>[1], value: string) => sql`lower(${column}) = lower(${value})`;

async function first(where: SQL | undefined): Promise<PriceRange | null> {
  const [row] = await db
    .select({ lowCents: areaPrices.lowCents, highCents: areaPrices.highCents })
    .from(areaPrices)
    .where(where)
    .limit(1);
  return row ?? null;
}

/** Area-level match first, then a district-wide row (one with no area). */
async function byPlace(kind: 'house' | 'apartment' | 'land_perch', asset: Asset): Promise<PriceRange | null> {
  return (
    (await first(and(eq(areaPrices.kind, kind), ieq(areaPrices.area, asset.area)))) ??
    (await first(and(eq(areaPrices.kind, kind), isNull(areaPrices.area), ieq(areaPrices.district, asset.district))))
  );
}

/** Market price range for an asset from the founders' area price table, or null when there is no match. */
export async function rangeFor(asset: Asset): Promise<PriceRange | null> {
  const details = asset.details ?? {};

  switch (asset.kind) {
    case 'house':
    case 'apartment':
      return byPlace(asset.kind, asset);
    case 'land': {
      const perches = Number(details.landPerches);
      if (!Number.isFinite(perches) || perches <= 0) return null;
      const perPerch = await byPlace('land_perch', asset);
      return perPerch && { lowCents: perPerch.lowCents * perches, highCents: perPerch.highCents * perches };
    }
    case 'car':
    case 'suv':
    case 'van': {
      const { make, model, year } = details;
      if (!make || !model || !year) return null;
      return first(
        and(
          eq(areaPrices.kind, 'vehicle'),
          ieq(areaPrices.make, String(make)),
          ieq(areaPrices.model, String(model)),
          eq(areaPrices.year, Number(year)),
        ),
      );
    }
    default:
      return null;
  }
}
