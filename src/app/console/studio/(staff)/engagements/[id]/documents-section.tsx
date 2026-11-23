import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents, engagements, REVENUE_INVOICE_TYPES, type DocumentType } from '@/db/schema';
import { signingBlocker } from '@/server/agreement-templates';
import Link from 'next/link';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';
import { addAdDeposit, addPayment, cancelInvoice, createDocument } from './documents-actions';

const TYPE_TEXT: Record<DocumentType, string> = {
  proposal: 'Proposal',
  agreement: 'Agreement (draft)',
  agreement_signed: 'Signed agreement',
  agreement_scan: 'Paper-signed agreement',
  invoice: 'Invoice',
  receipt: 'Ad deposit receipt',
  retainer_invoice: 'Retainer invoice',
  commission_invoice: 'Commission invoice',
  claim_pack: 'Commission claim pack',
};
const isRevenue = (t: DocumentType) => (REVENUE_INVOICE_TYPES as readonly string[]).includes(t);

export async function DocumentsSection({ engagementId }: { engagementId: string }) {
  const docs = await db.query.documents.findMany({
    where: eq(documents.engagementId, engagementId),
    orderBy: desc(documents.issuedAt),
    with: { payments: true },
  });
  const today = new Date().toISOString().slice(0, 10);
  const [e] = await db.select({ monthlyFeeCents: engagements.monthlyFeeCents, signedAt: engagements.signedAt }).from(engagements).where(eq(engagements.id, engagementId));
  const blocker = await signingBlocker(engagementId);
  const ops = ['proposal', 'agreement', 'invoice', ...(e?.monthlyFeeCents && e.signedAt ? (['retainer'] as const) : [])] as const;
  const opText: Record<string, string> = { proposal: 'Generate proposal', agreement: 'Generate agreement draft', invoice: 'Issue fee invoice', retainer: "Issue this month's retainer invoice" };

  return (
    <section className="grid gap-4 rounded-md border bg-background p-5">
      <h2 className="font-semibold">Documents and payments</h2>
      <div className="flex flex-wrap gap-2">
        {ops.map((op) => (
          <ActionForm key={op} action={createDocument} submitLabel={opText[op]} className="flex gap-2">
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="op" value={op} />
          </ActionForm>
        ))}
      </div>

      {blocker && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          Signing is blocked: {blocker}{' '}
          <Link href="/studio/settings/agreements" className="underline">
            Open agreement wording
          </Link>
        </p>
      )}

      <table className="w-full text-sm">
        <tbody>
          {docs.map((d) => {
            const paid = d.payments.reduce((s, p) => s + p.amountCents, 0);
            return (
              <tr key={d.id} className="border-b align-top">
                <td className="py-2">
                  <a href={`/studio/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-medium underline">
                    {TYPE_TEXT[d.type]} {d.number ?? ''}
                  </a>
                  <div className="text-xs text-muted-foreground">
                    {d.issuedAt.toLocaleString('en-GB')}
                    {d.dueOn && !d.paidAt ? ` · due ${d.dueOn}` : ''}
                    {d.type === 'agreement' && (d.meta.legalApproved === true ? ' · approved wording' : ' · draft wording, not signable')}
                  </div>
                  {d.voidedAt && <div className="text-xs text-destructive">Cancelled: {d.voidReason}</div>}
                </td>
                <td className="py-2">{d.totalCents != null ? formatLkr(d.totalCents) : ''}</td>
                <td className="py-2">
                  {isRevenue(d.type) || d.type === 'receipt'
                    ? d.paidAt
                      ? `Paid ${d.paidAt.toLocaleDateString('en-GB')}`
                      : `Paid so far ${formatLkr(paid)}`
                    : ''}
                </td>
                <td className="py-2">
                  {isRevenue(d.type) && !d.paidAt && !d.voidedAt && (
                    <ActionForm action={addPayment} submitLabel="Record payment" className="grid gap-2 sm:grid-cols-4 sm:items-end">
                      <input type="hidden" name="engagementId" value={engagementId} />
                      <input type="hidden" name="documentId" value={d.id} />
                      <input name="amountRupees" placeholder="Amount (Rs)" className={inputClass} />
                      <select name="method" defaultValue="bank_transfer" className={inputClass}>
                        <option value="bank_transfer">Bank transfer</option>
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                      </select>
                      <input name="reference" placeholder="Reference" className={inputClass} />
                      <input name="date" type="date" defaultValue={today} className={inputClass} />
                    </ActionForm>
                  )}
                  {isRevenue(d.type) && !d.paidAt && !d.voidedAt && (
                    <ActionForm action={cancelInvoice} submitLabel="Cancel invoice" className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="engagementId" value={engagementId} />
                      <input type="hidden" name="documentId" value={d.id} />
                      <input name="reason" placeholder="Why (required)" aria-label="Reason for cancelling" className={inputClass} />
                    </ActionForm>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Record the ad deposit</h3>
        <ActionForm action={addAdDeposit} submitLabel="Record deposit and issue receipt" className="grid gap-2 sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="engagementId" value={engagementId} />
          <Field label="Amount (Rs)">
            <input name="amountRupees" className={inputClass} />
          </Field>
          <Field label="Bank reference">
            <input name="reference" className={inputClass} />
          </Field>
          <Field label="Received on">
            <input name="date" type="date" defaultValue={today} className={inputClass} />
          </Field>
        </ActionForm>
      </div>
    </section>
  );
}
