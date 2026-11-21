import { describe, it, expect } from 'vitest';
import { db } from '@/db';
import { clients, engagements, assets } from '@/db/schema';
import { getPublicAsset, listPortfolio, assetJsonLd, sitemapXml } from '@/server/public-assets';

let n = 0;
async function asset(over: Partial<typeof assets.$inferInsert> = {}) {
  n += 1;
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Seller', phone: `+9477000${String(n).padStart(4, '0')}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({
      engagementId: e.id, category: 'property', kind: 'house', title: `House ${n}`, slug: `house-${n}-${crypto.randomUUID().slice(0, 6)}`,
      district: 'Colombo', area: 'Nugegoda', address: '12 Secret Lane, Nugegoda', askingPriceCents: 6_850_000_000,
      description: 'Lovely', status: 'live', publishedAt: new Date(Date.now() - 60_000),
      photos: [{ src: '/media/a-1600.webp', srcSet: '/media/a-640.webp 640w' }],
      ...over,
    })
    .returning();
  return { a, c };
}

describe('public assets', () => {
  it('hides draft, unpublished and future assets', async () => {
    const live = await asset();
    const draft = await asset({ status: 'draft' });
    const unpublished = await asset({ publishedAt: null });
    const future = await asset({ publishedAt: new Date(Date.now() + 86_400_000) });
    expect(await getPublicAsset('property', live.a.slug)).not.toBeNull();
    for (const x of [draft, unpublished, future]) expect(await getPublicAsset('property', x.a.slug)).toBeNull();
    expect((await listPortfolio()).map((p) => p.slug)).toEqual([live.a.slug]);
  });

  it('returns null on a category mismatch', async () => {
    const car = await asset({ category: 'vehicle', kind: 'car' });
    expect(await getPublicAsset('property', car.a.slug)).toBeNull();
    expect(await getPublicAsset('vehicle', car.a.slug)).not.toBeNull();
  });

  it('never exposes the address or the seller', async () => {
    const { a, c } = await asset();
    const p = await getPublicAsset('property', a.slug);
    expect(Object.keys(p!)).not.toContain('address');
    const json = JSON.stringify(p);
    expect(json).not.toContain('Secret Lane');
    expect(json).not.toContain(c.phone);
  });

  it('JSON-LD type matches category and has no address', async () => {
    const house = await getPublicAsset('property', (await asset()).a.slug);
    const car = await getPublicAsset('vehicle', (await asset({ category: 'vehicle', kind: 'car', details: { make: 'Toyota', model: 'Aqua', year: 2017 } })).a.slug);
    const h = assetJsonLd(house!);
    const v = assetJsonLd(car!);
    expect(h['@type']).toBe('RealEstateListing');
    expect(v['@type']).toBe('Product');
    expect(JSON.stringify(v)).toContain('"priceCurrency":"LKR"');
    expect(JSON.stringify([h, v])).not.toContain('Secret Lane');
  });

  it('sitemap lists only public assets', async () => {
    const live = await asset();
    const draft = await asset({ status: 'draft' });
    const xml = await sitemapXml();
    expect(xml).toContain(`http://vikkaa.test/property/${live.a.slug}`);
    expect(xml).not.toContain(draft.a.slug);
    expect(xml).toContain('<loc>http://vikkaa.test/how-it-works</loc>');
  });

  it('sold assets stay in the portfolio', async () => {
    const sold = await asset({ status: 'sold', soldAt: new Date(), soldPriceCents: 6_500_000_000 });
    expect((await listPortfolio()).find((p) => p.slug === sold.a.slug)?.status).toBe('sold');
  });
});
