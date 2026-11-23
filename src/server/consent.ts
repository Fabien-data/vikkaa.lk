import { and, desc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { buyers, consents, type ConsentPurpose, type MessagePurpose } from '@/db/schema';
import { normalisePhone } from '@/lib/phone';

/** One way to write a contact everywhere: E.164 for phones, lowercase for emails. Null if neither. */
export function contactKey(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  if (v.includes('@')) return v.toLowerCase();
  return normalisePhone(v);
}

export type ConsentInput = {
  contact: string;
  purpose: ConsentPurpose;
  granted: boolean;
  source: string;
  evidence?: Record<string, unknown>;
  recordedByUserId?: string;
  at?: Date;
};

/**
 * Appends a consent event. Also keeps the buyer's cached Circle columns in sync, because the
 * Studio buyer pages read them (and upsertBuyerByPhone never overwrites a filled column).
 */
export async function recordConsent(input: ConsentInput): Promise<void> {
  const contact = contactKey(input.contact);
  if (!contact) throw new Error('Consent needs a phone number or email address');
  const at = input.at ?? new Date();
  await db.insert(consents).values({
    contact,
    purpose: input.purpose,
    granted: input.granted,
    source: input.source,
    evidence: input.evidence ?? {},
    recordedByUserId: input.recordedByUserId,
    at,
  });
  if (input.purpose === 'marketing') return;
  const where = contact.includes('@') ? eq(buyers.email, contact) : eq(buyers.phone, contact);
  // Keep the first opt-in date while it stands; a re-join after withdrawing starts a new one.
  if (input.granted && input.purpose === 'circle') {
    await db
      .update(buyers)
      .set({ circleConsentAt: at, circleWithdrawnAt: null })
      .where(and(where, or(isNull(buyers.circleConsentAt), isNotNull(buyers.circleWithdrawnAt))));
  }
  if (!input.granted) await db.update(buyers).set({ circleWithdrawnAt: at }).where(where);
}

/** "Stop all messages" for one contact: unsubscribe links, STOP replies, "do not contact". */
export async function withdrawAll(contact: string, source: string, recordedByUserId?: string, evidence?: Record<string, unknown>): Promise<void> {
  await recordConsent({ contact, purpose: 'all', granted: false, source, recordedByUserId, evidence });
}

/** The latest consent event for these purposes, or undefined. */
async function latest(contact: string, purposes: ConsentPurpose[]) {
  const [row] = await db
    .select({ granted: consents.granted, purpose: consents.purpose, at: consents.at })
    .from(consents)
    .where(and(eq(consents.contact, contact), inArray(consents.purpose, purposes)))
    .orderBy(desc(consents.at))
    .limit(1);
  return row;
}

/**
 * May we send this kind of message to this contact?
 * - transactional (receipts, codes, reminders about their own deal): always.
 * - outreach (one-to-one business contact): unless they asked to stop everything.
 * - circle / marketing: only with a grant that is newer than any withdrawal.
 */
export async function canSend(rawContact: string, purpose: MessagePurpose): Promise<boolean> {
  if (purpose === 'transactional') return true;
  const contact = contactKey(rawContact);
  if (!contact) return false;
  if (purpose === 'outreach') {
    const last = await latest(contact, ['all']);
    return !last || last.granted;
  }
  const last = await latest(contact, [purpose, 'all']);
  return Boolean(last?.granted && last.purpose === purpose);
}

/** True if this contact has asked to stop everything (shown as "Do not contact" in the Studio). */
export async function isDoNotContact(rawContact: string | null | undefined): Promise<boolean> {
  const contact = contactKey(rawContact);
  if (!contact) return false;
  const last = await latest(contact, ['all']);
  return Boolean(last && !last.granted);
}
