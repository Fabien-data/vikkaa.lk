import { and, eq, inArray, isNotNull, lte } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';

const PUBLIC_STATUSES = ['live', 'under_offer', 'sold'] as const;

/** Visible to the public: a public status and a publish time that has passed. */
export const publiclyVisible = () =>
  and(inArray(assets.status, [...PUBLIC_STATUSES]), isNotNull(assets.publishedAt), lte(assets.publishedAt, new Date()));

export async function findPublicAssetIdBySlug(slug: string): Promise<{ id: string; title: string } | null> {
  const [row] = await db
    .select({ id: assets.id, title: assets.title })
    .from(assets)
    .where(and(eq(assets.slug, slug), publiclyVisible()));
  return row ?? null;
}
