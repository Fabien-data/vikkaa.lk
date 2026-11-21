import { createHash } from 'node:crypto';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { evidenceEntries, type Channel, type EvidenceEntry, type EvidenceType } from '@/db/schema';
import { canonicalJson } from '@/lib/canonical-json';
import { DEFAULT_ORG_ID } from '@/lib/rules';

export class EvidenceError extends Error {}

const GENESIS = '0'.repeat(64);
const FUTURE_TOLERANCE_MS = 5 * 60_000;

type HashFields = Pick<
  EvidenceEntry,
  'prevHash' | 'organizationId' | 'assetId' | 'buyerId' | 'type' | 'channel' | 'happenedAt' | 'recordedAt' | 'data' | 'correctsEntryId'
>;

// Fixed field order: verifyEvidenceChain recomputes exactly this.
function hashOf(e: HashFields): string {
  return createHash('sha256')
    .update(
      [
        e.prevHash,
        e.organizationId,
        e.assetId,
        e.buyerId,
        e.type,
        e.channel,
        e.happenedAt.toISOString(),
        e.recordedAt.toISOString(),
        canonicalJson(e.data ?? {}),
        e.correctsEntryId ?? '',
      ].join('|'),
    )
    .digest('hex');
}

/** Appends one entry to the organization's chain. `data` must never hold personal details. */
export async function appendEvidence(input: {
  assetId: string;
  buyerId: string;
  type: EvidenceType;
  channel: Channel;
  happenedAt: Date;
  data?: Record<string, unknown>;
  recordedByUserId?: string;
  correctsEntryId?: string;
}): Promise<EvidenceEntry> {
  if (input.happenedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) throw new EvidenceError('That time is in the future.');
  if (input.type === 'correction' && !input.correctsEntryId) throw new EvidenceError('A correction must point to the entry it corrects.');

  const organizationId = DEFAULT_ORG_ID;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`evidence:${organizationId}`}))`);
    const [last] = await tx
      .select({ hash: evidenceEntries.hash })
      .from(evidenceEntries)
      .where(eq(evidenceEntries.organizationId, organizationId))
      .orderBy(desc(evidenceEntries.seq))
      .limit(1);
    const fields: HashFields = {
      prevHash: last?.hash ?? GENESIS,
      organizationId,
      assetId: input.assetId,
      buyerId: input.buyerId,
      type: input.type,
      channel: input.channel,
      happenedAt: new Date(input.happenedAt.getTime()),
      recordedAt: new Date(),
      data: input.data ?? {},
      correctsEntryId: input.correctsEntryId ?? null,
    };
    const [row] = await tx
      .insert(evidenceEntries)
      .values({ ...fields, recordedByUserId: input.recordedByUserId, hash: hashOf(fields) })
      .returning();
    return row;
  });
}

/** Recomputes every hash in order; false if any entry was altered, removed or reordered. */
export async function verifyEvidenceChain(organizationId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(evidenceEntries)
    .where(eq(evidenceEntries.organizationId, organizationId))
    .orderBy(asc(evidenceEntries.seq));
  let prev = GENESIS;
  for (const row of rows) {
    if (row.prevHash !== prev || hashOf(row) !== row.hash) return false;
    prev = row.hash;
  }
  return true;
}
