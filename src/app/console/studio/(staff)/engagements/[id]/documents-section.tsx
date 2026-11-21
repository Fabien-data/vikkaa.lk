import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';
import { addAdDeposit, addPayment, createDocument } from './documents-actions';

const TYPE_TEXT = {
  proposal: 'Proposal',
  agreement: 'Agreement (draft)',
  agreement_signed: 'Signed agreement',
  agreement_scan: 'Paper-signed agreement',
  invoice: 'Invoice',
  receipt: 'Ad deposit receipt',
} as const;

export async function DocumentsSection({ engagementId }: { engagementId: string }) {
  const docs = await db.query.documents.findMany({
    where: eq(documents.engagementId, engagementId),
    orderBy: desc(documents.issuedAt),
    with: { payments: true },
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="grid gap-4 rounded-md border bg-background p-5">
      <h2 className="font-semibold">Documents and payments</h2>
      <div className="flex flex-wrap gap-2">
        {(['proposal', 'agreement', 'invoice'] as const).map((op) => (
          <ActionForm key={op} action={createDocument} submitLabel={`Generate ${op === 'agreement' ? 'agreement draft' : op}`} className="flex gap-2">
            <input type="hidden" name="engagementId" value={engagementId} />
            <input type="hidden" name="op" value={op} />
          </ActionForm>
        ))}
      </div>

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
                  <div className="text-xs text-muted-foreground">{d.issuedAt.toLocaleString('en-GB')}</div>
                </td>
                <td className="py-2">{d.totalCents != null ? formatLkr(d.totalCents) : ''}</td>
                <td className="py-2">
                  {d.type === 'invoice' || d.type === 'receipt'
                    ? d.paidAt
                      ? `Paid ${d.paidAt.toLocaleDateString('en-GB')}`
                      : `Paid so far ${formatLkr(paid)}`
                    : ''}
                </td>
                <td className="py-2">
                  {d.type === 'invoice' && !d.paidAt && (
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
