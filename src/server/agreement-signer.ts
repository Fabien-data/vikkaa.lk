import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { documents, signatories } from '@/db/schema';
import { isValidIdNumber } from '@/lib/id-number';
import { verifySigningCode } from '@/server/otp';
import { generateSignedAgreement, storeAgreementScan } from '@/server/documents';
import { markSigned } from '@/server/pipeline';

/** A signing problem the signatory can see and fix. */
export class SigningError extends Error {}

export async function signAgreement(input: {
  signatoryId: string;
  name: string;
  idNumber: string;
  code: string;
  ip: string;
  userAgent: string;
}): Promise<{ allSigned: boolean }> {
  const [s] = await db.select().from(signatories).where(eq(signatories.id, input.signatoryId));
  if (!s) throw new SigningError('This signing link is not valid.');
  if (s.signedAt) throw new SigningError('You have already signed this agreement.');
  if (input.name.trim().length < 2) throw new SigningError('Enter your full name.');
  if (!isValidIdNumber(input.idNumber)) throw new SigningError('Enter a valid NIC or passport ID number.');
  const [draft] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.engagementId, s.engagementId), eq(documents.type, 'agreement')))
    .limit(1);
  if (!draft) throw new SigningError('The agreement is not ready to sign yet.');
  if (!(await verifySigningCode(s.id, input.code.trim()))) {
    throw new SigningError('That code is wrong or has expired. Ask for a new code.');
  }

  const signedAt = new Date();
  await db
    .update(signatories)
    .set({
      signedAt,
      signedName: input.name.trim(),
      signedIdNumber: input.idNumber.trim().toUpperCase(),
      signedPhone: s.phone.startsWith('+94') ? s.phone : (s.email ?? s.phone),
      signedIp: input.ip,
      signedUserAgent: input.userAgent,
    })
    .where(and(eq(signatories.id, s.id), isNull(signatories.signedAt)));

  const all = await db.select().from(signatories).where(eq(signatories.engagementId, s.engagementId));
  if (all.some((x) => !x.signedAt)) return { allSigned: false };

  await generateSignedAgreement(
    s.engagementId,
    all.map((x) => ({
      name: x.signedName!,
      idNumber: x.signedIdNumber!,
      phone: x.signedPhone!,
      signedAt: x.signedAt!,
      ip: x.signedIp ?? '',
      role: x.role,
    })),
  );
  await markSigned(s.engagementId, signedAt);
  return { allSigned: true };
}

/** Staff alternative: a paper-signed scan is stored and the engagement marked signed. */
export async function signWithPaperScan(engagementId: string, bytes: Buffer, filename: string): Promise<void> {
  await storeAgreementScan(engagementId, bytes, filename);
  await markSigned(engagementId, new Date());
}
