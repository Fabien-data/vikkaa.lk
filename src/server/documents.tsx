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
import { REVENUE_INVOICE_TYPES, type Engagement } from '@/db/schema';
import { config } from '@/lib/config';
import { DAY_MS, sriLankaDay } from '@/lib/sl-time';
import { nextDocumentNumber } from '@/server/document-numbers';
import { activeTemplate, AGREEMENT_TITLES, kindFor, renderClauses } from '@/server/agreement-templates';
import { putPrivate, sha256 } from '@/server/storage';
import { markPaid } from '@/server/pipeline';
import { bankDetails } from '@/server/settings';
import { renderPdf } from '@/server/pdf/render';
import { AgreementPdf, InvoicePdf, ProposalPdf, ReceiptPdf, type EngagementForPdf, type SignatureLine } from '@/server/pdf/documents';

/** A problem staff can fix (missing data, bad amount). */
export class DocumentError extends Error {}

export async function loadEngagement(engagementId: string): Promise<EngagementForPdf> {
  const e = await db.query.engagements.findFirst({
    where: eq(engagements.id, engagementId),
    with: { client: true, assets: { orderBy: asc(assets.createdAt) }, comparables: { orderBy: asc(comparables.observedOn) } },
  });
  if (!e) throw new Error('Engagement not found');
  return e;
}

export async function store(
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
  // Single and batch sales are priced per asset; projects and retainers can be quoted before units exist.
  const pricedPerAsset = e.type === 'single' || e.type === 'batch';
  if (pricedPerAsset && (!e.assets.length || e.assets.some((a) => !a.recommendedPriceCents))) missing.push('recommended price on every asset');
  if (!e.contentPlan?.trim()) missing.push('content plan');
  if (!(e.upfrontFeeCents > 0 || e.monthlyFeeCents > 0 || e.foundingTerms)) missing.push('upfront fee, monthly fee or founding terms');
  if (missing.length) throw new DocumentError(`Before generating the proposal, add: ${missing.join(', ')}`);
  return store(e, 'proposal', await renderPdf(<ProposalPdf e={e} date={new Date()} bank={await bankDetails()} />));
}

/**
 * Each draft freezes the data and the exact clauses it was rendered from, so the signed copy shows what the
 * signers read. `legalApproved` records whether the wording was lawyer-approved: only those drafts can be signed.
 */
export async function generateAgreementDraft(engagementId: string): Promise<Document> {
  const e = await loadEngagement(engagementId);
  if (!e.assets.length && e.type !== 'retainer') throw new DocumentError('Add at least one asset before generating the agreement');
  const signed = await db
    .select({ id: signatories.id })
    .from(signatories)
    .where(and(eq(signatories.engagementId, engagementId), isNotNull(signatories.signedAt)))
    .limit(1);
  if (signed.length || e.signedAt) throw new DocumentError('Someone has already signed this agreement, so it can no longer be changed.');
  const kind = kindFor(e);
  const { template, approved } = await activeTemplate(kind);
  const clauses = renderClauses(template.clauses, e);
  const title = AGREEMENT_TITLES[kind];
  const date = new Date();
  return store(e, 'agreement', await renderPdf(<AgreementPdf e={e} date={date} title={title} clauses={clauses} legalApproved={approved} />), {
    issuedAt: date,
    meta: { snapshot: JSON.parse(JSON.stringify(e)), templateId: template.id, templateVersion: template.version, kind, title, clauses, legalApproved: approved },
  });
}

export async function generateSignedAgreement(draft: Document, signatures: SignatureLine[]): Promise<Document> {
  const e = draft.meta.snapshot as EngagementForPdf | undefined;
  const clauses = draft.meta.clauses as string[] | undefined;
  if (!e || !clauses) throw new DocumentError('This draft predates the approved-wording system. Generate a new agreement draft.');
  const title = (draft.meta.title as string | undefined) ?? AGREEMENT_TITLES.seller_exclusive;
  const bytes = await renderPdf(
    <AgreementPdf e={e} date={draft.issuedAt} title={title} clauses={clauses} legalApproved={draft.meta.legalApproved === true} signatures={signatures} draftSha256={draft.sha256} />,
  );
  return store(e, 'agreement_signed', bytes, {
    meta: { draftId: draft.id, draftSha256: draft.sha256, assetTitles: e.assets.map((a) => a.title), templateId: draft.meta.templateId, templateVersion: draft.meta.templateVersion },
  });
}

export async function storeAgreementScan(engagementId: string, bytes: Buffer, filename: string, extra: Record<string, unknown> = {}): Promise<Document> {
  const e = await loadEngagement(engagementId);
  return store(e, 'agreement_scan', bytes, { meta: { filename, ...extra } });
}

/** Seven days after the Sri Lanka date of `from`. */
export const dueInAWeek = (from: Date) => sriLankaDay(new Date(from.getTime() + 7 * DAY_MS));

export async function issueInvoice(engagementId: string): Promise<Document> {
  const e = await loadEngagement(engagementId);
  if (!(e.upfrontFeeCents > 0)) throw new DocumentError('Set the upfront fee before issuing an invoice');
  const date = new Date();
  const number = await nextDocumentNumber('VKA', date);
  const amountCents = e.upfrontFeeCents;
  const vatCents = Math.round((amountCents * config.vatRateBp) / 10_000);
  const totalCents = amountCents + vatCents;
  const dueOn = dueInAWeek(date);
  const titles = e.assets.map((a) => a.title).join(', ');
  const label = `${e.agreementKind === 'pilot' ? 'Project marketing pilot' : 'Marketing campaign fee'}${titles ? `: ${titles}` : ''}`;
  const bytes = await renderPdf(
    <InvoicePdf e={e} number={number} date={date} lines={[{ label, amountCents }]} vatCents={vatCents} totalCents={totalCents} dueOn={dueOn} bank={await bankDetails()} />,
  );
  return store(e, 'invoice', bytes, { number, amountCents, vatCents, totalCents, issuedAt: date, dueOn });
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
  if (!doc || !(REVENUE_INVOICE_TYPES as readonly string[]).includes(doc.type)) throw new DocumentError('Payments are recorded against invoices');
  if (doc.voidedAt) throw new DocumentError('This invoice was cancelled, so it cannot take payments');
  await db.insert(payments).values({ documentId, amountCents, method, reference, receivedAt: at, recordedByUserId });
  const [{ paid }] = await db.select({ paid: sum(payments.amountCents) }).from(payments).where(eq(payments.documentId, documentId));
  if (!doc.paidAt && Number(paid) >= (doc.totalCents ?? 0)) {
    await db.update(documents).set({ paidAt: at }).where(eq(documents.id, documentId));
  }
  await syncEngagementPaid(doc.engagementId, at);
}

/** Everything due before work starts has been received: the fee invoice, the first retainer month and the ad deposit. */
export async function isFullyPaid(e: Engagement): Promise<boolean> {
  const docs = await db
    .select({ type: documents.type, paidAt: documents.paidAt, totalCents: documents.totalCents, voidedAt: documents.voidedAt })
    .from(documents)
    .where(eq(documents.engagementId, e.id));
  const live = docs.filter((d) => !d.voidedAt);
  if (e.upfrontFeeCents > 0 && !live.some((d) => d.type === 'invoice' && d.paidAt)) return false;
  if (e.monthlyFeeCents > 0 && !live.some((d) => d.type === 'retainer_invoice' && d.paidAt)) return false;
  const deposits = live.filter((d) => d.type === 'receipt').reduce((sum, d) => sum + (d.totalCents ?? 0), 0);
  return !(e.adBudgetCents > 0 && deposits < e.adBudgetCents);
}

/** Marks the engagement paid once nothing is outstanding. With nothing to pay at all, it counts as paid on signing. */
export async function syncEngagementPaid(engagementId: string, at: Date): Promise<void> {
  const [e] = await db.select().from(engagements).where(eq(engagements.id, engagementId));
  if (!e || e.paidAt) return;
  const nothingDue = !(e.upfrontFeeCents > 0) && !(e.monthlyFeeCents > 0) && !(e.adBudgetCents > 0);
  if (nothingDue && !e.signedAt) return;
  if (await isFullyPaid(e)) await markPaid(engagementId, at);
}
