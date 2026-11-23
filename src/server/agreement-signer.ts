import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { documents, engagements, signatories } from '@/db/schema';
import { isValidIdNumber } from '@/lib/id-number';
import { verifySigningCode } from '@/server/otp';
import { generateSignedAgreement, storeAgreementScan, syncEngagementPaid } from '@/server/documents';
import { signingBlocker } from '@/server/agreement-templates';
import { InvalidTransitionError, markSigned } from '@/server/pipeline';

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

  const [engagement] = await db.select().from(engagements).where(eq(engagements.id, s.engagementId));
  const [draft] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.engagementId, s.engagementId), eq(documents.type, 'agreement')))
    .orderBy(desc(documents.issuedAt))
    .limit(1);
  if (!draft || engagement?.stage !== 'proposal') throw new SigningError('The agreement is not ready to sign yet.');
  const all = await db.select().from(signatories).where(eq(signatories.engagementId, s.engagementId));
  if (all.some((x) => x.signedAt && x.signedDocumentId !== draft.id)) {
    throw new SigningError('The agreement changed after another owner signed. Ask Vikkaa for the current version.');
  }
  if (await signingBlocker(s.engagementId)) throw new SigningError('This agreement is not ready to sign yet. Ask Vikkaa for a new link.');
  if (!(await verifySigningCode(s.id, input.code.trim()))) {
    throw new SigningError('That code is wrong or has expired. Ask for a new code.');
  }

  const signedAt = new Date();
  const updated = await db
    .update(signatories)
    .set({
      signedAt,
      signedName: input.name.trim(),
      signedIdNumber: input.idNumber.trim().toUpperCase(),
      signedPhone: s.phone.startsWith('+94') ? s.phone : (s.email ?? s.phone),
      signedIp: input.ip,
      signedUserAgent: input.userAgent,
      signedDocumentId: draft.id,
      signedDocumentSha256: draft.sha256,
    })
    .where(and(eq(signatories.id, s.id), isNull(signatories.signedAt)))
    .returning({ id: signatories.id });
  if (!updated.length) throw new SigningError('You have already signed this agreement.');

  const now = await db.select().from(signatories).where(eq(signatories.engagementId, s.engagementId));
  if (now.some((x) => !x.signedAt)) return { allSigned: false };

  const [fresh] = await db.select({ signedAt: engagements.signedAt }).from(engagements).where(eq(engagements.id, s.engagementId));
  if (fresh?.signedAt) return { allSigned: true }; // another signatory finished at the same moment
  await generateSignedAgreement(
    draft,
    now.map((x) => ({
      name: x.signedName!,
      idNumber: x.signedIdNumber!,
      phone: x.signedPhone!,
      signedAt: x.signedAt!,
      ip: x.signedIp ?? '',
      role: x.role,
    })),
  );
  try {
    await markSigned(s.engagementId, signedAt);
  } catch (err) {
    if (!(err instanceof InvalidTransitionError)) throw err; // lost a race to another final signature
  }
  await syncEngagementPaid(s.engagementId, signedAt);
  return { allSigned: true };
}

/**
 * Staff alternative: a paper-signed scan is stored and the engagement marked signed (proposals only, once).
 * Allowed when the latest draft used lawyer-approved wording, or when staff confirm the paper agreement itself
 * was drafted by a lawyer (their name is stored with the scan).
 */
export async function signWithPaperScan(engagementId: string, bytes: Buffer, filename: string, lawyerName?: string | null): Promise<void> {
  const [e] = await db.select().from(engagements).where(eq(engagements.id, engagementId));
  if (!e || e.stage !== 'proposal' || e.signedAt) {
    throw new InvalidTransitionError('Only an unsigned proposal can be marked signed with a paper scan.');
  }
  const lawyer = lawyerName?.trim();
  if ((await signingBlocker(engagementId)) && !lawyer) {
    throw new InvalidTransitionError('The agreement wording is not lawyer-approved. Enter the name of the lawyer who drafted the paper agreement.');
  }
  await storeAgreementScan(engagementId, bytes, filename, lawyer ? { lawyerDraftedBy: lawyer } : {});
  const at = new Date();
  await markSigned(engagementId, at);
  await syncEngagementPaid(engagementId, at);
}
