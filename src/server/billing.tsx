import { and, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, clients, documents, engagements, payments, REVENUE_INVOICE_TYPES, type Document } from '@/db/schema';
import { config } from '@/lib/config';
import { signPath } from '@/lib/signed-url';
import { DAY_MS, sriLankaDay, sriLankaMidnight } from '@/lib/sl-time';
import { nextDocumentNumber } from '@/server/document-numbers';
import { DocumentError, loadEngagement, store } from '@/server/documents';
import { renderPdf } from '@/server/pdf/render';
import { InvoicePdf } from '@/server/pdf/documents';
import { bankDetails } from '@/server/settings';

/** "2026-12" for an instant, in Sri Lanka time. */
export const periodOf = (d: Date) => sriLankaDay(d).slice(0, 7);

const monthName = (period: string) => new Date(`${period}-15T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A fresh 7-day portal sign-in link, for emails that point the client at their portal. */
export const portalUrl = (clientId: string) => `${config.appUrl}${signPath(`/portal/login/${clientId}`, 7 * 86_400)}`;

/**
 * The retainer invoice for one month. Idempotent: the same engagement and month always return the same invoice,
 * so a scheduler running twice, or staff pressing the button after it, never bills twice.
 */
export async function issueRetainerInvoice(engagementId: string, period: string, now = new Date()): Promise<{ doc: Document; created: boolean }> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new DocumentError('Choose a month like 2026-12');
  const key = `retainer:${engagementId}:${period}`;
  const [existing] = await db.select().from(documents).where(eq(documents.key, key));
  if (existing) return { doc: existing, created: false };

  const e = await loadEngagement(engagementId);
  if (!(e.monthlyFeeCents > 0)) throw new DocumentError('This engagement has no monthly fee');
  if (!e.signedAt) throw new DocumentError('Retainer invoices start once the agreement is signed');
  if (period < periodOf(e.signedAt)) throw new DocumentError('That month is before the agreement was signed');

  const issueDay = `${period}-${String(Math.min(e.billingDay ?? 1, 28)).padStart(2, '0')}`;
  const today = sriLankaDay(now);
  const base = issueDay > today ? issueDay : today;
  const dueOn = sriLankaDay(new Date(sriLankaMidnight(base).getTime() + 7 * DAY_MS));
  const monthStart = sriLankaMidnight(`${period}-01`);
  const [y, m] = period.split('-').map(Number);
  const monthEnd = sriLankaMidnight(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`);
  const [{ used }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(assets)
    .where(and(eq(assets.engagementId, engagementId), gte(assets.createdAt, monthStart), lt(assets.createdAt, monthEnd)));

  const amountCents = e.monthlyFeeCents;
  const vatCents = Math.round((amountCents * config.vatRateBp) / 10_000);
  const totalCents = amountCents + vatCents;
  const number = await nextDocumentNumber('VKA', now);
  const label = `Monthly retainer, ${monthName(period)}${e.unitsPerMonth ? `: up to ${e.unitsPerMonth} listings` : ''}`;
  const bytes = await renderPdf(
    <InvoicePdf e={e} number={number} date={now} lines={[{ label, amountCents }]} vatCents={vatCents} totalCents={totalCents} dueOn={dueOn} bank={await bankDetails()} />,
  );
  try {
    const doc = await store(e, 'retainer_invoice', bytes, {
      number,
      amountCents,
      vatCents,
      totalCents,
      issuedAt: now,
      dueOn,
      key,
      meta: { period, unitsPerMonth: e.unitsPerMonth, unitsUsed: used },
    });
    return { doc, created: true };
  } catch (err) {
    // Lost a race with another issuer for the same month: return theirs.
    const [winner] = await db.select().from(documents).where(eq(documents.key, key));
    if (winner) return { doc: winner, created: false };
    throw err;
  }
}

/** Cancels an unpaid invoice (it keeps its number for the books). */
export async function voidInvoice(documentId: string, reason: string, now = new Date()): Promise<void> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc || !(REVENUE_INVOICE_TYPES as readonly string[]).includes(doc.type)) throw new DocumentError('Only invoices can be cancelled');
  if (doc.paidAt) throw new DocumentError('A paid invoice cannot be cancelled. Issue a refund and tell the accountant.');
  await db.update(documents).set({ voidedAt: now, voidReason: reason }).where(and(eq(documents.id, documentId), isNull(documents.voidedAt)));
}

export type OpenInvoice = Document & { clientId: string; clientName: string; clientEmail: string | null; paidSoFarCents: number };

/** Every unpaid, not-cancelled revenue invoice, oldest due first. */
export async function openInvoices(): Promise<OpenInvoice[]> {
  const rows = await db
    .select({
      doc: documents,
      clientId: clients.id,
      clientName: clients.name,
      clientEmail: clients.email,
      paidSoFarCents: sql<number>`coalesce((select sum(${payments.amountCents}) from ${payments} where ${payments.documentId} = ${documents.id}), 0)::bigint`,
    })
    .from(documents)
    .innerJoin(engagements, eq(documents.engagementId, engagements.id))
    .innerJoin(clients, eq(engagements.clientId, clients.id))
    .where(and(inArray(documents.type, [...REVENUE_INVOICE_TYPES]), isNull(documents.paidAt), isNull(documents.voidedAt)))
    .orderBy(sql`${documents.dueOn} asc nulls last`, documents.issuedAt);
  return rows.map((r) => ({ ...r.doc, clientId: r.clientId, clientName: r.clientName, clientEmail: r.clientEmail, paidSoFarCents: Number(r.paidSoFarCents) }));
}
