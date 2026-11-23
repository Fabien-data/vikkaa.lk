'use server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { signatories } from '@/db/schema';
import { verifySignedPath } from '@/lib/signed-url';
import { rateLimit } from '@/lib/rate-limit';
import { sendSigningCode, OtpTooSoonError } from '@/server/otp';
import { signAgreement, SigningError } from '@/server/agreement-signer';
import { signingBlocker } from '@/server/agreement-templates';

export type CodeState = { sent?: string; error?: string } | undefined;
export type SignState = { signed?: true; allSigned?: boolean; error?: string } | undefined;

const linkOk = (id: string, exp: string, sig: string) => verifySignedPath(`/sign/${id}`, new URLSearchParams({ exp, sig })) === 'ok';

function mask(contact: string): string {
  return contact.includes('@') ? contact.replace(/^(.).*(@.*)$/, '$1•••$2') : `•••${contact.slice(-4)}`;
}

export async function requestCode(id: string, exp: string, sig: string): Promise<CodeState> {
  if (!linkOk(id, exp, sig)) return { error: 'This link has expired. Ask Vikkaa for a new one.' };
  if (!rateLimit(`otp:${id}`, 5, 3_600_000)) return { error: 'Too many codes requested. Try again in an hour.' };
  const [owner] = await db.select({ engagementId: signatories.engagementId }).from(signatories).where(eq(signatories.id, id));
  if (!owner || (await signingBlocker(owner.engagementId))) return { error: 'This agreement is not ready to sign yet. Ask Vikkaa for a new link.' };
  try {
    const channel = await sendSigningCode(id);
    const [s] = await db.select({ phone: signatories.phone, email: signatories.email }).from(signatories).where(eq(signatories.id, id));
    return { sent: channel === 'sms' ? `We sent a code by SMS to ${mask(s.phone)}.` : `We emailed a code to ${mask(s.email!)}.` };
  } catch (err) {
    if (err instanceof OtpTooSoonError) return { error: err.message };
    throw err;
  }
}

export async function submitSignature(_prev: SignState, form: FormData): Promise<SignState> {
  const id = String(form.get('id'));
  if (!linkOk(id, String(form.get('exp')), String(form.get('sig')))) {
    return { error: 'This link has expired. Ask Vikkaa for a new one.' };
  }
  const h = await headers();
  try {
    const { allSigned } = await signAgreement({
      signatoryId: id,
      name: String(form.get('name') ?? ''),
      idNumber: String(form.get('idNumber') ?? ''),
      code: String(form.get('code') ?? ''),
      ip: h.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      userAgent: h.get('user-agent') ?? '',
    });
    return { signed: true, allSigned };
  } catch (err) {
    if (err instanceof SigningError) return { error: err.message };
    throw err;
  }
}
