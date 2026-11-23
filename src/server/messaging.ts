import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { messages, type MessagePurpose, type SubjectType } from '@/db/schema';
import { config } from '@/lib/config';
import { signPath } from '@/lib/signed-url';
import { whatsappLink } from '@/lib/whatsapp';
import { sriLankaDay, sriLankaHour, sriLankaMidnight } from '@/lib/sl-time';
import { canSend, contactKey } from '@/server/consent';
import { sendEmail } from '@/server/email';
import { getSettings } from '@/server/settings';

export type SendResult = { status: 'sent'; messageId: string } | { status: 'blocked' | 'failed'; reason: string; messageId?: string };

const TEN_YEARS = 10 * 365 * 86_400;
const NON_TRANSACTIONAL: MessagePurpose[] = ['outreach', 'circle', 'marketing'];

/** Effectively permanent: an unsubscribe link must keep working years later. The message row knows the address. */
export const unsubscribeUrl = (messageId: string) => `${config.publicUrl}${signPath(`/unsubscribe/${messageId}`, TEN_YEARS)}`;

export async function inSendingHours(now: Date): Promise<boolean> {
  const { messaging } = await getSettings();
  const h = sriLankaHour(now);
  return h >= messaging.quietStartHour && h < messaging.quietEndHour;
}

async function emailsSentToday(now: Date, filter: { userId?: string; purposes?: MessagePurpose[] } = {}): Promise<number> {
  const since = sriLankaMidnight(sriLankaDay(now));
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        eq(messages.channel, 'email'),
        eq(messages.direction, 'out'),
        inArray(messages.status, ['sent', 'sending']),
        gte(messages.sentAt, since),
        filter.userId ? eq(messages.fromUserId, filter.userId) : undefined,
        filter.purposes ? inArray(messages.purpose, filter.purposes) : undefined,
      ),
    );
  return n;
}

/** Why a non-transactional email can't go now, or null if it can. Checks hours and daily caps (consent is checked separately). */
export async function emailBlocker(purpose: MessagePurpose, now: Date, fromUserId?: string): Promise<string | null> {
  const { messaging } = await getSettings();
  const total = await emailsSentToday(now);
  if (purpose === 'transactional') return total >= messaging.emailDailyCap ? `Daily email limit (${messaging.emailDailyCap}) reached` : null;
  if (!(await inSendingHours(now))) return `Outside sending hours (${messaging.quietStartHour}:00–${messaging.quietEndHour}:00 Sri Lanka time)`;
  if (total >= messaging.emailDailyCap - messaging.transactionalReserve) return 'Daily email limit reached (the rest is kept for receipts and reminders)';
  if (purpose === 'outreach' && fromUserId && (await emailsSentToday(now, { userId: fromUserId, purposes: ['outreach'] })) >= messaging.perSenderDailyCap) {
    return `Daily limit reached: you have sent your ${messaging.perSenderDailyCap} outreach emails for today`;
  }
  return null;
}

export type TrackedEmail = {
  to: string;
  subject: string;
  body: string;
  purpose: MessagePurpose;
  fromUser?: { id: string; name: string; email: string };
  subjectRef?: { type: SubjectType; id: string };
  templateKey?: string;
  dedupeKey?: string;
  now?: Date;
};

/**
 * Sends one email and records it in the messages log. Non-transactional mail is checked against
 * consent, sending hours and daily caps, and always carries an unsubscribe link and header.
 */
export async function sendTrackedEmail(input: TrackedEmail): Promise<SendResult> {
  const now = input.now ?? new Date();
  const to = contactKey(input.to);
  if (!to || !to.includes('@')) return { status: 'blocked', reason: 'No valid email address' };
  const nonTransactional = NON_TRANSACTIONAL.includes(input.purpose);
  const base = {
    channel: 'email' as const,
    purpose: input.purpose,
    toAddress: to,
    fromUserId: input.fromUser?.id,
    subjectType: input.subjectRef?.type,
    subjectId: input.subjectRef?.id,
    templateKey: input.templateKey,
    subject: input.subject,
    body: input.body,
    dedupeKey: input.dedupeKey,
  };

  if (!(await canSend(to, input.purpose))) {
    const [row] = await db.insert(messages).values({ ...base, status: 'blocked', blockedReason: 'Asked not to be contacted' }).onConflictDoNothing().returning();
    return { status: 'blocked', reason: 'This contact asked not to be contacted', messageId: row?.id };
  }
  const blocker = await emailBlocker(input.purpose, now, input.fromUser?.id);
  if (blocker) return { status: 'blocked', reason: blocker };

  const id = crypto.randomUUID();
  const unsubscribe = unsubscribeUrl(id);
  const text = nonTransactional ? `${input.body}\n\n--\nNo more emails from Vikkaa? ${unsubscribe}` : input.body;
  const [row] = await db
    .insert(messages)
    .values({ ...base, id, body: text, status: 'sending', attempts: 1, sentAt: now })
    .onConflictDoNothing()
    .returning();
  if (!row) return { status: 'blocked', reason: 'Already sent' }; // same dedupeKey

  try {
    const res = await sendEmail({
      to,
      subject: input.subject,
      text,
      fromName: input.fromUser ? `${input.fromUser.name} at Vikkaa` : undefined,
      replyTo: input.fromUser?.email,
      headers: nonTransactional ? { 'List-Unsubscribe': `<${unsubscribe}>` } : undefined,
    });
    await db.update(messages).set({ status: 'sent', providerId: res?.id ?? null }).where(eq(messages.id, id));
    return { status: 'sent', messageId: id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Free the dedupe key: the next attempt (e.g. the next ticker run) may retry. The failed row stays as a record.
    await db.update(messages).set({ status: 'failed', lastError: reason, dedupeKey: null }).where(eq(messages.id, id));
    return { status: 'failed', reason, messageId: id };
  }
}

/**
 * A wa.me link with the message filled in, for a founder to send from their own phone.
 * Null when the contact asked not to be contacted. Outreach and marketing carry a STOP line.
 */
export async function whatsappDraft(phone: string | null, text: string, purpose: MessagePurpose): Promise<string | null> {
  const to = contactKey(phone);
  if (!to || to.includes('@') || !(await canSend(to, purpose))) return null;
  const body = purpose === 'transactional' ? text : `${text}\n\nReply STOP and we will not message you again.`;
  return whatsappLink(to, body);
}
