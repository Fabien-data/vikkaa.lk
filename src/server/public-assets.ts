import { and, desc, eq, inArray, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { config } from '@/lib/config';
import type { AssetCategory } from '@/lib/enums';

const PUBLIC_STATUSES = ['live', 'under_offer', 'sold'] as const;

/** Visible to the public: a public status and a publish time that has passed. */
export const publiclyVisible = () =>
  and(inArray(assets.status, [...PUBLIC_STATUSES]), isNotNull(assets.publishedAt), lte(assets.publishedAt, new Date()));

/** The only asset fields the public site may use. No address, no client, no engagement. */
const publicColumns = {
  id: assets.id,
  slug: assets.slug,
  category: assets.category,
  kind: assets.kind,
  title: assets.title,
  description: assets.description,
  district: assets.district,
  area: assets.area,
  askingPriceCents: assets.askingPriceCents,
  details: assets.details,
  photos: assets.photos,
  youtubeUrl: assets.youtubeUrl,
  status: assets.status,
  publishedAt: assets.publishedAt,
  soldAt: assets.soldAt,
};

export type PublicAsset = {
  [K in keyof typeof publicColumns]: (typeof assets.$inferSelect)[K];
};

export const publicPath = (a: Pick<PublicAsset, 'category' | 'slug'>) => `/${a.category}/${a.slug}`;

export async function getPublicAsset(category: AssetCategory, slug: string): Promise<PublicAsset | null> {
  const [row] = await db
    .select(publicColumns)
    .from(assets)
    .where(and(eq(assets.slug, slug), eq(assets.category, category), publiclyVisible()));
  return row ?? null;
}

export async function listPortfolio(limit = 60): Promise<PublicAsset[]> {
  return db.select(publicColumns).from(assets).where(publiclyVisible()).orderBy(desc(assets.publishedAt)).limit(limit);
}

export async function findPublicAssetIdBySlug(slug: string): Promise<{ id: string; title: string } | null> {
  const [row] = await db.select({ id: assets.id, title: assets.title }).from(assets).where(and(eq(assets.slug, slug), publiclyVisible()));
  return row ?? null;
}

/** schema.org data for search engines. Locality only, never the street address. */
export function assetJsonLd(a: PublicAsset): Record<string, unknown> {
  const url = `${config.publicUrl}${publicPath(a)}`;
  const image = a.photos.map((p) => `${config.publicUrl}${p.src}`);
  const offers = {
    '@type': 'Offer',
    price: a.askingPriceCents / 100,
    priceCurrency: 'LKR',
    availability: a.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    url,
  };
  if (a.category === 'vehicle') {
    const d = a.details;
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: a.title,
      description: a.description ?? undefined,
      image,
      brand: d.make ? { '@type': 'Brand', name: String(d.make) } : undefined,
      model: d.model ? String(d.model) : undefined,
      offers,
    };
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: a.title,
    description: a.description ?? undefined,
    url,
    image,
    datePosted: a.publishedAt?.toISOString(),
    contentLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: a.area, addressRegion: a.district, addressCountry: 'LK' } },
    offers,
  };
}

const STATIC_PAGES = ['/', '/how-it-works', '/portfolio', '/sell', '/buy', '/privacy', '/terms'];

export async function sitemapXml(): Promise<string> {
  const items = await listPortfolio(5000);
  const urls = [
    ...STATIC_PAGES.map((p) => ({ loc: `${config.publicUrl}${p === '/' ? '' : p}`, lastmod: undefined as string | undefined })),
    ...items.map((a) => ({ loc: `${config.publicUrl}${publicPath(a)}`, lastmod: a.publishedAt?.toISOString() })),
  ];
  const body = urls.map((u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
