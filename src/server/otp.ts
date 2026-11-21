import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { signatories } from '@/db/schema';
import { config } from '@/lib/config';
import { sendSms } from '@/server/sms';
import { sendEmail } from '@/server/email';

export class OtpTooSoonError extends Error {}

const TTL_MS = 10 * 60_000;
const RESEND_AFTER_MS = 60_000;
const MAX_ATTEMPTS = 5;

const hashCode = (signatoryId: string, code: string) =>
  createHmac('sha256', config.appSecret).update(`${signatoryId}:${code}`).digest('hex');

/** Sends a fresh 6-digit code: SMS for Sri Lankan numbers, email for everyone else (Notify.lk is local only). */
export async function sendSigningCode(signatoryId: string): Promise<'sms' | 'email'> {
  const [s] = await db.select().from(signatories).where(eq(signatories.id, signatoryId));
  if (!s) throw new Error('Signatory not found');
  if (s.signedAt) throw new Error('This signatory has already signed');
  if (s.otpSentAt && Date.now() - s.otpSentAt.getTime() < RESEND_AFTER_MS) {
    throw new OtpTooSoonError('Please wait a minute before asking for another code.');
  }
  const local = s.phone.startsWith('+94');
  if (!local && !s.email) throw new Error('Signatories abroad need an email for their code.');

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  await db
    .update(signatories)
    .set({ otpHash: hashCode(s.id, code), otpExpiresAt: new Date(now.getTime() + TTL_MS), otpSentAt: now, otpAttempts: 0 })
    .where(eq(signatories.id, s.id));

  const message = `Your Vikkaa signing code is ${code}. It expires in 10 minutes.`;
  if (local) {
    await sendSms(s.phone, message);
    return 'sms';
  }
  await sendEmail({ to: s.email!, subject: 'Your Vikkaa signing code', text: message });
  return 'email';
}

/**
 * True once for a correct, unexpired code with attempts left. Both steps are single conditional UPDATEs, so parallel
 * guesses each use up an attempt and a correct code can only be consumed once.
 */
export async function verifySigningCode(signatoryId: string, code: string): Promise<boolean> {
  const [attempt] = await db
    .update(signatories)
    .set({ otpAttempts: sql`${signatories.otpAttempts} + 1` })
    .where(
      and(
        eq(signatories.id, signatoryId),
        isNotNull(signatories.otpHash),
        lt(signatories.otpAttempts, MAX_ATTEMPTS),
        gt(signatories.otpExpiresAt, new Date()),
      ),
    )
    .returning({ otpHash: signatories.otpHash });
  if (!attempt?.otpHash || !/^\d{6}$/.test(code)) return false;
  if (!timingSafeEqual(Buffer.from(hashCode(signatoryId, code), 'hex'), Buffer.from(attempt.otpHash, 'hex'))) return false;
  const consumed = await db
    .update(signatories)
    .set({ otpHash: null, otpExpiresAt: null })
    .where(and(eq(signatories.id, signatoryId), eq(signatories.otpHash, attempt.otpHash)))
    .returning({ id: signatories.id });
  return consumed.length === 1;
}
