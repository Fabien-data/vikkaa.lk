import { describe, it, expect } from 'vitest';
import { db } from '@/db';
import { areaPrices, type Asset } from '@/db/schema';
import { rangeFor } from '@/server/area-prices';

function asset(over: Partial<Asset>): Asset {
  return {
    category: 'property',
    kind: 'house',
    district: 'Colombo',
    area: 'Nugegoda',
    details: {},
    ...over,
  } as Asset;
}

describe('rangeFor', () => {
  it('matches house by area, case-insensitively', async () => {
    await db.insert(areaPrices).values({ kind: 'house', district: 'Colombo', area: 'Nugegoda', lowCents: 400, highCents: 900, source: 'LPW Q2' });
    expect(await rangeFor(asset({ area: 'nugegoda' }))).toEqual({ lowCents: 400, highCents: 900 });
  });

  it('house falls back to district', async () => {
    await db.insert(areaPrices).values({ kind: 'house', district: 'Colombo', lowCents: 100, highCents: 200, source: 'x' });
    expect(await rangeFor(asset({ area: 'Kottawa' }))).toEqual({ lowCents: 100, highCents: 200 });
  });

  it('land multiplies per-perch by perches', async () => {
    await db.insert(areaPrices).values({ kind: 'land_perch', district: 'Colombo', area: 'Maharagama', lowCents: 150_000_000, highCents: 200_000_000, source: 'x' });
    const land = asset({ kind: 'land', area: 'Maharagama', details: { landPerches: 10 } });
    expect(await rangeFor(land)).toEqual({ lowCents: 1_500_000_000, highCents: 2_000_000_000 });
  });

  it('land without perches has no range', async () => {
    await db.insert(areaPrices).values({ kind: 'land_perch', area: 'Maharagama', lowCents: 1, highCents: 2, source: 'x' });
    expect(await rangeFor(asset({ kind: 'land', area: 'Maharagama' }))).toBeNull();
  });

  it('vehicle needs exact make, model and year', async () => {
    await db.insert(areaPrices).values({ kind: 'vehicle', make: 'Toyota', model: 'Aqua', year: 2017, lowCents: 800, highCents: 900, source: 'riyasewana' });
    const car = (year: number) =>
      asset({ category: 'vehicle', kind: 'car', details: { make: 'toyota', model: 'AQUA', year } });
    expect(await rangeFor(car(2017))).toEqual({ lowCents: 800, highCents: 900 });
    expect(await rangeFor(car(2018))).toBeNull();
  });

  it('returns null when nothing matches', async () => {
    expect(await rangeFor(asset({}))).toBeNull();
  });
});
