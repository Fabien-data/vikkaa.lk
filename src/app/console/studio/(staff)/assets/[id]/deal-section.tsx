import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { buyers, evidenceEntries } from '@/db/schema';
import { dealsForAsset } from '@/server/deals';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';
import { agreeSaleAction, completeSaleAction, fallThroughAction } from './deal-actions';

const BASIS_TEXT: Record<string, string> = {
  exclusive: 'commission: sold in the exclusive period',
  follow_on: 'commission: introduced buyer, follow-on period',
  introduced: 'commission: introduced buyer',
  none: 'no commission',
};

/** Agreed sales on this asset, and the form to record one. Commission is worked out from the signed terms. */
export async function DealSection({ assetId, preselectBuyer }: { assetId: string; preselectBuyer?: string }) {
  const [history, introduced] = await Promise.all([
    dealsForAsset(assetId),
    db.selectDistinct({ id: buyers.id, name: buyers.name, phone: buyers.phone }).from(evidenceEntries).innerJoin(buyers, eq(evidenceEntries.buyerId, buyers.id)).where(eq(evidenceEntries.assetId, assetId)),
  ]);
  const open = history.find((h) => h.deal.status === 'agreed');

  return (
    <section id="deal" className="grid gap-4 panel p-5">
      <h2 className="font-semibold">Sale</h2>
      {history.length > 0 && (
        <ul className="grid gap-3 text-sm">
          {history.map(({ deal: d, buyerName, buyerPhone }) => (
            <li key={d.id} className="rounded border p-3">
              <p>
                <strong>{formatLkr(d.agreedPriceCents)}</strong> · {d.status === 'agreed' ? 'agreed' : d.status === 'completed' ? 'completed' : 'fell through'} ·{' '}
                {buyerName || buyerPhone ? `${buyerName ?? ''} ${buyerPhone ?? ''}`.trim() : 'buyer found by the seller'} · {BASIS_TEXT[d.basis] ?? d.basis}
              </p>
              <p className="text-muted-foreground">
                Agreed {d.agreedAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' })}
                {d.completionDueOn ? ` · completion due ${d.completionDueOn}` : ''}
                {d.notary ? ` · notary ${d.notary}` : ''}
                {d.fellThroughReason ? ` · ${d.fellThroughReason}` : ''}
              </p>
              {d.status === 'agreed' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ActionForm action={completeSaleAction} submitLabel="Mark completed" className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="assetId" value={assetId} />
                    <input type="hidden" name="dealId" value={d.id} />
                    <input type="datetime-local" name="completedAt" aria-label="Completed at" className={inputClass} />
                  </ActionForm>
                  <ActionForm action={fallThroughAction} submitLabel="Fell through" className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="assetId" value={assetId} />
                    <input type="hidden" name="dealId" value={d.id} />
                    <input name="reason" placeholder="Why" aria-label="Why the sale fell through" className={inputClass} />
                  </ActionForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!open && (
        <ActionForm action={agreeSaleAction} submitLabel="Record agreed sale" className="grid gap-3">
          <input type="hidden" name="assetId" value={assetId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Buyer">
              <select name="buyerId" defaultValue={preselectBuyer ?? ''} className={inputClass}>
                <option value="">Found by the seller (not introduced by us)</option>
                {introduced.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name ?? 'Unnamed'} {b.phone}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Agreed price (Rs)">
              <input name="priceRupees" inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="Agreed on" hint="Blank means now">
              <input type="datetime-local" name="agreedAt" className={inputClass} />
            </Field>
            <Field label="Deed or transfer due">
              <input type="date" name="completionDueOn" className={inputClass} />
            </Field>
            <Field label="Advance paid (Rs)">
              <input name="advanceRupees" inputMode="numeric" className={inputClass} />
            </Field>
            <Field label="Notary">
              <input name="notary" className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      )}
    </section>
  );
}
