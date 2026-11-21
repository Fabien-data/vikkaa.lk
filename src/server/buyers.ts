import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { buyers, type Buyer } from '@/db/schema';
import { DEFAULT_ORG_ID } from '@/lib/rules';

export type BuyerInput = Omit<typeof buyers.$inferInsert, 'id' | 'organizationId' | 'phone' | 'createdAt' | 'updatedAt'>;

const isEmpty = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Finds the buyer by phone (E.164) or creates them. Only fills fields that are empty today, so a blank form field never
 * wipes stored data and a consent timestamp is only ever set once. Safe against double submits.
 */
export async function upsertBuyerByPhone(e164: string, attrs: Partial<BuyerInput>): Promise<Buyer> {
  const clean = Object.fromEntries(Object.entries(attrs).filter(([, v]) => !isEmpty(v))) as Partial<BuyerInput>;
  const [created] = await db
    .insert(buyers)
    .values({ ...clean, phone: e164 })
    .onConflictDoNothing({ target: [buyers.organizationId, buyers.phone] })
    .returning();
  if (created) return created;

  const where = and(eq(buyers.organizationId, DEFAULT_ORG_ID), eq(buyers.phone, e164));
  const [existing] = await db.select().from(buyers).where(where);
  const fill = Object.fromEntries(
    Object.entries(clean).filter(([k]) => isEmpty(existing[k as keyof Buyer])),
  ) as Partial<BuyerInput>;
  if (!Object.keys(fill).length) return existing;
  const [updated] = await db.update(buyers).set(fill).where(where).returning();
  return updated;
}
