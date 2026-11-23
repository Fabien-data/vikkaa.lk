import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { numberSequences } from '@/db/schema';
import { sriLankaYear } from '@/lib/sl-time';

/** Next number like "VKA-2026-001". One atomic upsert, so concurrent calls never collide. Resets each Sri Lanka calendar year. */
export async function nextDocumentNumber(prefix: 'VKA' | 'RCP', at: Date = new Date()): Promise<string> {
  const year = sriLankaYear(at);
  const [row] = await db
    .insert(numberSequences)
    .values({ key: `${prefix}-${year}`, last: 1 })
    .onConflictDoUpdate({ target: numberSequences.key, set: { last: sql`${numberSequences.last} + 1` } })
    .returning({ last: numberSequences.last });
  return `${prefix}-${year}-${String(row.last).padStart(3, '0')}`;
}
