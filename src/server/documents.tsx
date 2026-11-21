import { and, asc, eq, isNotNull, sum } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  comparables,
  documents,
  engagements,
  payments,
  signatories,
  type Document,
  type DocumentType,
  type PaymentMethod,
} from '@/db/schema';
import { config } from '@/lib/config';
import { nextDocumentNumber } from '@/server/document-numbers';
import { putPrivate, sha256 } from '@/server/storage';
import { markPaid } from '@/server/pipeline';
import { renderPdf } from '@/server/pdf/render';
import { AgreementPdf, InvoicePdf, ProposalPdf, ReceiptPdf, type EngagementForPdf, type SignatureLine } from '@/server/pdf/documents';

/** A problem staff can fix (missing data, bad amount). */
export class DocumentError extends Error {}

async function loadEngagement(engagementId: string): Promise<EngagementForPdf> {
  const e = await db.query.engagements.findFirst({
    where: eq(engagements.id, engagementId),
    with: { client: true, assets: { orderBy: asc(assets.createdAt) }, comparables: { orderBy: asc(comparables.observedOn) } },
  });
  if (!e) throw new Error('Engagement not found');
  return e;
}

async function store(
  e: EngagementForPdf,
  type: DocumentType,
  bytes: Buffer,
  fields: Partial<typeof documents.$inferInsert> = {},
): Promise<Document> {
  const name = fields.number ?? `${Date.now()}`;
  const storageKey = `documents/${e.organizationId}/${e.id}/${type}-${name}.pdf`;
  await putPrivate(storageKey, bytes);
  const [doc] = await db
    .insert(documents)
    .values({ engagementId: e.id, type, storageKey, sha256: sha256(bytes), ...fields })
    .returning();
  return doc;
}

export async function generateProposal(engagementId: string): Promise<Document> {
  const e = await loadEngagement(engagementId);
  const missing: string[] = [];
  if (!e.assets.length || e.assets.some((a) => !a.recommendedPriceCents)) missing.push('recommended price on every asset');
  if (!e.contentPlan?.trim()) missing.push('content plan');
  if (!(e.upfrontFeeCents > 0)) missing.push('upfront fee');
  if (missing.length) throw new DocumentError(`Before generating the proposal, add: ${missing.join(', ')}`);
  return store(e, 'proposal', await renderPdf(<ProposalPdf e={e} date={new Date()} />));
}

/** Each draft freezes the data it was rendered from, so the signed copy shows exactly what the signers read. */
export async function generateAgreementDraft(engagementId: string): Promise<Document> {
  const e = await loadEngagement(engagementId);
  if (!e.assets.length) throw new DocumentError('Add at least one asset before generating the agreement');
  const signed = await db
    .select({ id: signatories.id })
    .from(signatories)
    .where(and(eq(signatories.engagementId, engagementId), isNotNull(signatories.signedAt)))
    .limit(1);
  if (signed.length) throw new DocumentError('Someone has already signed this agreement, so it can no longer be changed.');
  const date = new Date();
  return store(e, 'agreement', await renderPdf(<AgreementPdf e={e} date={date} />), {
    issuedAt: date,
    meta: { snapshot: JSON.parse(JSON.stringify(e)) },
  });
}

export async function generateSignedAgreement(draft: Document, signatures: SignatureLine[]): Promise<Document> {
  const e = draft.meta.snapshot as EngagementForPdf | undefined;
  if (!e) throw new DocumentError('This draft predates signing snapshots. Generate a new agreement draft.');
  const bytes = await renderPdf(<AgreementPdf e={e} date={draft.issuedAt} signatures={signatures} draftSha256={draft.sha256} />);
  return store(e, 'agreement_signed', bytes, {
    meta: { draftId: draft.id, draftSha256: draft.sha256, assetTitles: e.assets.map((a) => a.title) },
  });
}

export async function storeAgreementScan(engagementId: string, bytes: Buffer, filename: string): Promise<Document> {
  const e = await loadEngagement(engagementId);
  return store(e, 'agreement_scan', bytes, { meta: { filename } });
}

export async function issueInvoice(engagementId: string): Promise<Document> {
  const e = await loadEngagement(engagementId);
  if (!(e.upfrontFeeCents > 0)) throw new DocumentError('Set the upfront fee before issuing an invoice');
  const date = new Date();
  const number = await nextDocumentNumber('VKA', date);
  const amountCents = e.upfrontFeeCents;
  const vatCents = Math.round((amountCents * config.vatRateBp) / 10_000);
  const totalCents = amountCents + vatCents;
  const bytes = await renderPdf(
    <InvoicePdf e={e} number={number} date={date} amountCents={amountCents} vatCents={vatCents} totalCents={totalCents} />,
  );
  return store(e, 'invoice', bytes, { number, amountCents, vatCents, totalCents, issuedAt: date });
}

/** The client's ad budget arrives as a deposit: a receipt (not an invoice) that is paid on creation. */
export async function recordAdDeposit(engagementId: string, amountCents: number, reference: string, at: Date): Promise<Document> {
  if (!(amountCents > 0)) throw new DocumentError('Deposit amount must be more than zero');
  const e = await loadEngagement(engagementId);
  const number = await nextDocumentNumber('RCP', at);
  const bytes = await renderPdf(<ReceiptPdf e={e} number={number} date={at} amountCents={amountCents} reference={reference} />);
  const doc = await store(e, 'receipt', bytes, { number, amountCents, vatCents: 0, totalCents: amountCents, issuedAt: at, paidAt: at });
  await db.insert(payments).values({ documentId: doc.id, amountCents, method: 'bank_transfer', reference, receivedAt: at });
  await syncEngagementPaid(engagementId, at);
  return doc;
}

export async function recordPayment(
  documentId: string,
  amountCents: number,
  method: PaymentMethod,
  reference: string | null,
  at: Date,
  recordedByUserId?: string,
): Promise<void> {
  if (!(amountCents > 0)) throw new DocumentError('Payment amount must be more than zero');
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc || doc.type !== 'invoice') throw new DocumentError('Payments are recorded against invoices');
  await db.insert(payments).values({ documentId, amountCents, method, reference, receivedAt: at, recordedByUserId });
  const [{ paid }] = await db.select({ paid: sum(payments.amountCents) }).from(payments).where(eq(payments.documentId, documentId));
  if (!doc.paidAt && Number(paid) >= (doc.totalCents ?? 0)) {
    await db.update(documents).set({ paidAt: at }).where(eq(documents.id, documentId));
  }
  await syncEngagementPaid(doc.engagementId, at);
}

/** Paid = an invoice is fully paid and the ad deposit (if any) has been received in full. */
async function syncEngagementPaid(engagementId: string, at: Date): Promise<void> {
  const [e] = await db.select().from(engagements).where(eq(engagements.id, engagementId));
  if (!e || e.paidAt) return;
  const paidInvoices = await db
    .select({ id: documents.id, paidAt: documents.paidAt })
    .from(documents)
    .where(and(eq(documents.engagementId, engagementId), eq(documents.type, 'invoice')));
  if (!paidInvoices.some((d) => d.paidAt)) return;
  const [{ deposits }] = await db
    .select({ deposits: sum(documents.totalCents) })
    .from(documents)
    .where(and(eq(documents.engagementId, engagementId), eq(documents.type, 'receipt')));
  if (e.adBudgetCents > 0 && Number(deposits ?? 0) < e.adBudgetCents) return;
  await markPaid(engagementId, at);
}
