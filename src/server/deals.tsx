import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  adLedger,
  assets,
  buyers,
  deals,
  documents,
  engagements,
  evidenceEntries,
  type AdLedgerKind,
  type Deal,
  type Document,
} from '@/db/schema';
import { config } from '@/lib/config';
import { formatLkr } from '@/lib/money';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { DAY_MS, sriLankaDay } from '@/lib/sl-time';
import { appendEvidence, verifyEvidenceChain } from '@/server/evidence-log';
import { advanceAsset } from '@/server/pipeline';
import { kindFor } from '@/server/agreement-templates';
import { commissionFor, type Commission } from '@/server/commission';
import { nextDocumentNumber } from '@/server/document-numbers';
import { DocumentError, loadEngagement, store } from '@/server/documents';
import { voidInvoice } from '@/server/billing';
import { renderPdf } from '@/server/pdf/render';
import { ClaimPackPdf, InvoicePdf, type InvoiceLine } from '@/server/pdf/documents';
import { bankDetails } from '@/server/settings';

/** A deal problem staff can fix. */
export class DealError extends Error {}

/** Did Vikkaa record this buyer for this asset on or before the cut-off? (The evidence log is the proof.) */
export async function buyerIntroduced(assetId: string, buyerId: string | null, cutoff: Date): Promise<boolean> {
  if (!buyerId) return false;
  const [row] = await db
    .select({ id: evidenceEntries.id })
    .from(evidenceEntries)
    .where(and(eq(evidenceEntries.assetId, assetId), eq(evidenceEntries.buyerId, buyerId), lte(evidenceEntries.happenedAt, cutoff)))
    .limit(1);
  return Boolean(row);
}

/** Fee paid (before VAT) and fee credit already used on this engagement's earlier commission invoices. */
async function feeCredit(engagementId: string): Promise<{ feePaidCents: number; creditUsedCents: number }> {
  const docs = await db
    .select({ type: documents.type, amountCents: documents.amountCents, paidAt: documents.paidAt, voidedAt: documents.voidedAt, meta: documents.meta })
    .from(documents)
    .where(eq(documents.engagementId, engagementId));
  const live = docs.filter((d) => !d.voidedAt);
  return {
    feePaidCents: live.filter((d) => d.type === 'invoice' && d.paidAt).reduce((s, d) => s + (d.amountCents ?? 0), 0),
    creditUsedCents: live.filter((d) => d.type === 'commission_invoice').reduce((s, d) => s + Number(d.meta.creditCents ?? 0), 0),
  };
}

/** Works out the commission for a proposed sale without saving anything (shown before staff confirm). */
export async function previewCommission(input: { assetId: string; buyerId: string | null; priceCents: number; agreedAt: Date }): Promise<Commission> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, input.assetId));
  if (!asset) throw new DealError('Asset not found');
  const e = await loadEngagement(asset.engagementId);
  const kind = kindFor(e);
  const cutoff = kind === 'retainer' || kind === 'pilot' ? input.agreedAt : (e.endsAt ?? input.agreedAt);
  return commissionFor({
    agreementKind: kind,
    commissionApplies: e.commissionApplies,
    rateBp: e.commissionRateBp,
    minCents: e.commissionMinCents,
    signedAt: e.signedAt,
    endsAt: e.endsAt,
    retainerEndsOn: e.retainerEndsOn,
    followOnMonths: e.followOnMonths,
    saleAgreedAt: input.agreedAt,
    salePriceCents: input.priceCents,
    buyerIntroduced: await buyerIntroduced(input.assetId, input.buyerId, cutoff),
    ...(await feeCredit(e.id)),
    vatRateBp: config.vatRateBp,
  });
}

async function issueCommissionInvoice(deal: Deal, c: Commission, now: Date): Promise<Document> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, deal.assetId));
  const e = await loadEngagement(asset.engagementId);
  const number = await nextDocumentNumber('VKA', now);
  const pct = (e.commissionRateBp / 100).toFixed(e.commissionRateBp % 100 === 0 ? 0 : 2);
  const lines: InvoiceLine[] = [
    { label: `Commission: ${pct}% of ${formatLkr(deal.agreedPriceCents)} (${asset.title})${c.grossCents > Math.round((deal.agreedPriceCents * e.commissionRateBp) / 10_000) ? ', contract minimum' : ''}`, amountCents: c.grossCents },
  ];
  if (c.creditCents > 0) lines.push({ label: 'Less: upfront marketing fee credited', amountCents: -c.creditCents });
  const dueOn = deal.completionDueOn ?? sriLankaDay(new Date(now.getTime() + 30 * DAY_MS));
  const bytes = await renderPdf(
    <InvoicePdf e={e} number={number} date={now} lines={lines} vatCents={c.vatCents} totalCents={c.totalCents} dueOn={dueOn} bank={await bankDetails()} title="Commission invoice" />,
  );
  return store(e, 'commission_invoice', bytes, {
    number,
    amountCents: c.netCents,
    vatCents: c.vatCents,
    totalCents: c.totalCents,
    issuedAt: now,
    dueOn,
    assetId: asset.id,
    key: `commission:${deal.id}`,
    meta: { dealId: deal.id, basis: c.basis, grossCents: c.grossCents, creditCents: c.creditCents, salePriceCents: deal.agreedPriceCents, reason: c.reason },
  });
}

export type AgreeSaleInput = {
  assetId: string;
  buyerId?: string | null;
  priceCents: number;
  agreedAt: Date;
  completionDueOn?: string | null;
  advanceCents?: number;
  notary?: string | null;
  userId?: string;
};

/**
 * A sale is agreed: the listing goes under offer, the accepted offer is logged as evidence, and the commission
 * invoice is raised from the signed terms (with the fee credit shown). A follow-on sale after expiry works the same way.
 */
export async function agreeSale(input: AgreeSaleInput, now = new Date()): Promise<{ deal: Deal; commission: Commission; invoice: Document | null }> {
  if (!(input.priceCents > 0)) throw new DealError('Enter the agreed price');
  if (input.completionDueOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.completionDueOn)) throw new DealError('Enter the completion date as a date');
  const [asset] = await db.select().from(assets).where(eq(assets.id, input.assetId));
  if (!asset) throw new DealError('Asset not found');
  const [open] = await db.select({ id: deals.id }).from(deals).where(and(eq(deals.assetId, asset.id), eq(deals.status, 'agreed')));
  if (open) throw new DealError('This asset already has an agreed sale. Complete it or mark it fallen through first.');
  if (input.buyerId) {
    const [b] = await db.select({ id: buyers.id }).from(buyers).where(eq(buyers.id, input.buyerId));
    if (!b) throw new DealError('Buyer not found');
  }
  const commission = await previewCommission({ assetId: asset.id, buyerId: input.buyerId ?? null, priceCents: input.priceCents, agreedAt: input.agreedAt });

  const [deal] = await db
    .insert(deals)
    .values({
      assetId: asset.id,
      buyerId: input.buyerId ?? null,
      agreedPriceCents: input.priceCents,
      agreedAt: input.agreedAt,
      completionDueOn: input.completionDueOn ?? null,
      advanceCents: input.advanceCents ?? 0,
      notary: input.notary ?? null,
      basis: commission.basis,
      createdByUserId: input.userId,
    })
    .returning();
  let invoice: Document | null = null;
  try {
    invoice = commission.basis === 'none' ? null : await issueCommissionInvoice(deal, commission, now);
  } catch (err) {
    await db.delete(deals).where(eq(deals.id, deal.id)); // nothing else points at it yet
    throw err;
  }
  if (asset.status === 'live') await advanceAsset(asset.id, 'under_offer');
  if (input.buyerId) {
    await appendEvidence({
      assetId: asset.id,
      buyerId: input.buyerId,
      type: 'offer',
      channel: 'in_person',
      happenedAt: input.agreedAt,
      data: { accepted: true, dealId: deal.id, priceCents: input.priceCents },
      recordedByUserId: input.userId,
    });
  }
  return { deal, commission, invoice };
}

export async function completeSale(dealId: string, completedAt = new Date()): Promise<void> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal || deal.status !== 'agreed') throw new DealError('Only an agreed sale can be completed');
  await db.update(deals).set({ status: 'completed', completedAt }).where(eq(deals.id, dealId));
  const [asset] = await db.select().from(assets).where(eq(assets.id, deal.assetId));
  if (asset && (asset.status === 'under_offer' || asset.status === 'live')) await advanceAsset(asset.id, 'sold', { soldPriceCents: deal.agreedPriceCents });
  else if (asset) await db.update(assets).set({ soldAt: completedAt, soldPriceCents: deal.agreedPriceCents }).where(eq(assets.id, asset.id));
}

/** The sale fell through: the commission invoice is cancelled and the listing goes back live. */
export async function fallThrough(dealId: string, reason: string, now = new Date()): Promise<void> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal || deal.status !== 'agreed') throw new DealError('Only an agreed sale can fall through');
  if (!reason.trim()) throw new DealError('Say why the sale fell through');
  await db.update(deals).set({ status: 'fell_through', fellThroughAt: now, fellThroughReason: reason.trim() }).where(eq(deals.id, dealId));
  const [inv] = await db.select().from(documents).where(eq(documents.key, `commission:${deal.id}`));
  if (inv && !inv.paidAt && !inv.voidedAt) await voidInvoice(inv.id, `Sale fell through: ${reason.trim()}`, now);
  const [asset] = await db.select().from(assets).where(eq(assets.id, deal.assetId));
  if (asset?.status === 'under_offer') await advanceAsset(asset.id, 'live');
}

export async function dealsForAsset(assetId: string) {
  return db
    .select({ deal: deals, buyerName: buyers.name, buyerPhone: buyers.phone })
    .from(deals)
    .leftJoin(buyers, eq(deals.buyerId, buyers.id))
    .where(eq(deals.assetId, assetId))
    .orderBy(desc(deals.agreedAt));
}

/** Engagements whose exclusive period has ended but whose follow-on period is still running, with the buyers Vikkaa introduced. */
export async function followOnWatch(now = new Date()) {
  const rows = await db
    .select({ e: engagements })
    .from(engagements)
    .where(and(isNotNull(engagements.endsAt), lte(engagements.endsAt, now), ne(engagements.stage, 'closed'), sql`${engagements.monthlyFeeCents} = 0`));
  const out: { engagementId: string; endsAt: Date; watchUntil: Date; buyers: { id: string; name: string | null; phone: string; assetId: string; assetTitle: string }[] }[] = [];
  for (const { e } of rows) {
    const watchUntil = new Date(e.endsAt!);
    watchUntil.setUTCMonth(watchUntil.getUTCMonth() + e.followOnMonths);
    if (watchUntil <= now) continue;
    const introduced = await db
      .selectDistinct({ id: buyers.id, name: buyers.name, phone: buyers.phone, assetId: assets.id, assetTitle: assets.title })
      .from(evidenceEntries)
      .innerJoin(buyers, eq(evidenceEntries.buyerId, buyers.id))
      .innerJoin(assets, eq(evidenceEntries.assetId, assets.id))
      .where(and(eq(assets.engagementId, e.id), lte(evidenceEntries.happenedAt, e.endsAt!)));
    out.push({ engagementId: e.id, endsAt: e.endsAt!, watchUntil, buyers: introduced });
  }
  return out;
}

/** A PDF of everything that backs a commission claim, stored on the engagement (never shown in the client portal). */
export async function generateClaimPack(engagementId: string, buyerId: string | null, now = new Date()): Promise<Document> {
  const e = await loadEngagement(engagementId);
  const assetIds = e.assets.map((a) => a.id);
  if (!assetIds.length) throw new DocumentError('This engagement has no assets');
  const rows = await db
    .select({ x: evidenceEntries, assetTitle: assets.title })
    .from(evidenceEntries)
    .innerJoin(assets, eq(evidenceEntries.assetId, assets.id))
    .where(and(inArray(evidenceEntries.assetId, assetIds), buyerId ? eq(evidenceEntries.buyerId, buyerId) : undefined))
    .orderBy(asc(evidenceEntries.seq));
  const [buyer] = buyerId ? await db.select({ name: buyers.name, phone: buyers.phone }).from(buyers).where(eq(buyers.id, buyerId)) : [];
  const [signed] = await db
    .select({ sha256: documents.sha256, issuedAt: documents.issuedAt })
    .from(documents)
    .where(and(eq(documents.engagementId, engagementId), inArray(documents.type, ['agreement_signed', 'agreement_scan'])))
    .orderBy(desc(documents.issuedAt))
    .limit(1);
  const chainOk = await verifyEvidenceChain(DEFAULT_ORG_ID);
  const bytes = await renderPdf(
    <ClaimPackPdf
      e={e}
      date={now}
      buyer={buyer ?? null}
      chainOk={chainOk}
      signedAgreement={signed ?? null}
      entries={rows.map((r) => ({ seq: r.x.seq, type: r.x.type, channel: r.x.channel, happenedAt: r.x.happenedAt, recordedAt: r.x.recordedAt, hash: r.x.hash, assetTitle: r.assetTitle }))}
    />,
  );
  return store(e, 'claim_pack', bytes, { issuedAt: now, meta: { buyerId, entries: rows.length, chainOk } });
}

export async function addLedgerEntry(input: {
  engagementId: string;
  assetId?: string | null;
  kind: AdLedgerKind;
  amountCents: number;
  channel?: string | null;
  occurredOn: string;
  reference?: string | null;
  note?: string | null;
  userId?: string;
}): Promise<void> {
  if (!(input.amountCents > 0)) throw new DealError('Enter an amount');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) throw new DealError('Enter the date');
  await db.insert(adLedger).values({ ...input, recordedByUserId: input.userId });
}

/** The client's ad money: deposits received (receipts), spent, refunded, and what is left. */
export async function adBalance(engagementId: string): Promise<{ depositCents: number; spentCents: number; refundedCents: number; balanceCents: number }> {
  const [{ deposit }] = await db
    .select({ deposit: sql<number>`coalesce(sum(${documents.totalCents}), 0)::bigint` })
    .from(documents)
    .where(and(eq(documents.engagementId, engagementId), eq(documents.type, 'receipt'), isNull(documents.voidedAt)));
  const rows = await db
    .select({ kind: adLedger.kind, total: sql<number>`coalesce(sum(${adLedger.amountCents}), 0)::bigint` })
    .from(adLedger)
    .where(eq(adLedger.engagementId, engagementId))
    .groupBy(adLedger.kind);
  const spentCents = Number(rows.find((r) => r.kind === 'spend')?.total ?? 0);
  const refundedCents = Number(rows.find((r) => r.kind === 'refund')?.total ?? 0);
  const depositCents = Number(deposit);
  return { depositCents, spentCents, refundedCents, balanceCents: depositCents - spentCents - refundedCents };
}

export async function ledgerFor(engagementId: string) {
  return db.select().from(adLedger).where(eq(adLedger.engagementId, engagementId)).orderBy(desc(adLedger.occurredOn));
}

/** Agreed sales, newest first (for the war room and money page). */
export async function agreedDealsCount(): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(deals).where(inArray(deals.status, ['agreed', 'completed']));
  return n;
}

