import Link from 'next/link';
import { and, desc, eq, gt, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { clients, documents, engagements, payments, REVENUE_INVOICE_TYPES } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { openInvoices, periodOf } from '@/server/billing';
import { activeRetainers } from '@/server/war-room';
import { adBalance, followOnWatch } from '@/server/deals';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';
import { sriLankaDay } from '@/lib/sl-time';
import { addAdSpend, issueThisMonth, makeClaimPack } from './actions';

const TYPE_TEXT: Record<string, string> = { invoice: 'Fee', retainer_invoice: 'Retainer', commission_invoice: 'Commission' };

export default async function MoneyPage() {
  await requireStaff();
  const now = new Date();
  const today = sriLankaDay(now);
  const period = periodOf(now);
  const [open, retainers, watch, recent, withBudget] = await Promise.all([
    openInvoices(),
    activeRetainers(now),
    followOnWatch(now),
    db
      .select({ p: payments, number: documents.number, type: documents.type, engagementId: documents.engagementId })
      .from(payments)
      .innerJoin(documents, eq(payments.documentId, documents.id))
      .orderBy(desc(payments.receivedAt))
      .limit(15),
    db
      .select({ id: engagements.id, clientName: clients.name })
      .from(engagements)
      .innerJoin(clients, eq(engagements.clientId, clients.id))
      .where(and(isNotNull(engagements.signedAt), gt(engagements.adBudgetCents, 0))),
  ]);
  const retainerRows = await Promise.all(
    retainers.map(async (r) => {
      const [e] = await db.select({ clientName: clients.name, billingDay: engagements.billingDay }).from(engagements).innerJoin(clients, eq(engagements.clientId, clients.id)).where(eq(engagements.id, r.id));
      const [inv] = await db.select({ number: documents.number, paidAt: documents.paidAt }).from(documents).where(eq(documents.key, `retainer:${r.id}:${period}`));
      return { ...r, ...e, thisMonth: inv };
    }),
  );
  const balances = await Promise.all(withBudget.map(async (w) => ({ ...w, ...(await adBalance(w.id)) })));
  const owed = open.reduce((s, i) => s + (i.totalCents ?? 0) - i.paidSoFarCents, 0);
  const mrr = retainers.reduce((s, r) => s + r.monthlyFeeCents, 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Money</h1>
        <p className="text-sm text-muted-foreground">
          Owed to us {formatLkr(owed)} · monthly recurring {formatLkr(mrr)}
        </p>
      </div>

      <section className="panel p-5" aria-labelledby="owed-h">
        <h2 id="owed-h" className="mb-3 font-semibold">Owed to us</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th scope="col" className="py-2">Invoice</th>
                <th scope="col" className="py-2">Client</th>
                <th scope="col" className="py-2">Due</th>
                <th scope="col" className="py-2 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {open.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="py-2">
                    <Link href={`/studio/engagements/${i.engagementId}`} className="underline">
                      {TYPE_TEXT[i.type] ?? i.type} {i.number}
                    </Link>
                  </td>
                  <td className="py-2">{i.clientName}</td>
                  <td className={`py-2 ${i.dueOn && i.dueOn < today ? 'font-medium text-destructive' : ''}`}>{i.dueOn ?? '—'}</td>
                  <td className="py-2 text-right tabular-nums">{formatLkr((i.totalCents ?? 0) - i.paidSoFarCents)}</td>
                </tr>
              ))}
              {open.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Nothing owed right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5" aria-labelledby="ret-h">
        <h2 id="ret-h" className="mb-1 font-semibold">Retainers</h2>
        <p className="mb-3 text-sm text-muted-foreground">Invoices are issued automatically on each billing day. Use the button only to issue early.</p>
        <ul className="grid gap-2 text-sm">
          {retainerRows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 border-t pt-2">
              <Link href={`/studio/engagements/${r.id}`} className="font-medium underline">
                {r.clientName}
              </Link>
              <span>{formatLkr(r.monthlyFeeCents)} / month · billed day {r.billingDay ?? 1}</span>
              {r.thisMonth ? (
                <span className="text-muted-foreground">
                  {period}: {r.thisMonth.number} {r.thisMonth.paidAt ? '(paid)' : '(unpaid)'}
                </span>
              ) : (
                <ActionForm action={issueThisMonth} submitLabel={`Issue ${period} invoice`} className="flex items-center gap-2">
                  <input type="hidden" name="engagementId" value={r.id} />
                  <input type="hidden" name="period" value={period} />
                </ActionForm>
              )}
            </li>
          ))}
          {retainerRows.length === 0 && <li className="text-muted-foreground">No active retainers yet.</li>}
        </ul>
      </section>

      <section className="panel p-5" aria-labelledby="watch-h">
        <h2 id="watch-h" className="mb-1 font-semibold">Follow-on watch</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Agreements that have ended but whose follow-on period is still running. If one of these buyers buys, commission is still due.
        </p>
        <ul className="grid gap-4 text-sm">
          {watch.map((w) => (
            <li key={w.engagementId} className="border-t pt-3">
              <p>
                <Link href={`/studio/engagements/${w.engagementId}`} className="font-medium underline">
                  Engagement
                </Link>{' '}
                ended {sriLankaDay(w.endsAt)} · watch until {sriLankaDay(w.watchUntil)}
              </p>
              <ul className="mt-2 grid gap-2">
                {w.buyers.map((b) => (
                  <li key={`${b.id}-${b.assetId}`} className="flex flex-wrap items-center gap-3">
                    <span>
                      {b.name ?? 'Unnamed'} {b.phone} · {b.assetTitle}
                    </span>
                    <Link href={`/studio/assets/${b.assetId}?buyer=${b.id}#deal`} className="underline">
                      Possible breach: record the sale
                    </Link>
                    <ActionForm action={makeClaimPack} submitLabel="Make claim pack" className="flex items-center gap-2">
                      <input type="hidden" name="engagementId" value={w.engagementId} />
                      <input type="hidden" name="buyerId" value={b.id} />
                    </ActionForm>
                  </li>
                ))}
                {w.buyers.length === 0 && <li className="text-muted-foreground">No buyers were introduced.</li>}
              </ul>
            </li>
          ))}
          {watch.length === 0 && <li className="text-muted-foreground">Nothing in a follow-on period.</li>}
        </ul>
      </section>

      <section className="panel p-5" aria-labelledby="ads-h">
        <h2 id="ads-h" className="mb-1 font-semibold">Ad budgets</h2>
        <p className="mb-3 text-sm text-muted-foreground">Record what was spent from each client&rsquo;s ad deposit (from Ads Manager), so the balance and any refund are always clear.</p>
        <ul className="mb-4 grid gap-1 text-sm">
          {balances.map((b) => (
            <li key={b.id}>
              <Link href={`/studio/engagements/${b.id}`} className="underline">
                {b.clientName}
              </Link>
              : deposit {formatLkr(b.depositCents)} · spent {formatLkr(b.spentCents)} · refunded {formatLkr(b.refundedCents)} ·{' '}
              <strong>left {formatLkr(b.balanceCents)}</strong>
            </li>
          ))}
          {balances.length === 0 && <li className="text-muted-foreground">No signed engagements with an ad budget yet.</li>}
        </ul>
        {withBudget.length > 0 && (
          <ActionForm action={addAdSpend} submitLabel="Record" className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-6">
              <Field label="Client">
                <select name="engagementId" className={inputClass}>
                  {withBudget.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.clientName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select name="kind" defaultValue="spend" className={inputClass}>
                  <option value="spend">Spend</option>
                  <option value="refund">Refund to client</option>
                </select>
              </Field>
              <Field label="Amount (Rs)">
                <input name="amountRupees" inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="Channel">
                <input name="channel" placeholder="Facebook" className={inputClass} />
              </Field>
              <Field label="Date">
                <input type="date" name="occurredOn" defaultValue={today} className={inputClass} />
              </Field>
              <Field label="Reference">
                <input name="reference" className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        )}
      </section>

      <section className="panel p-5" aria-labelledby="paid-h">
        <h2 id="paid-h" className="mb-3 font-semibold">Recent payments</h2>
        <ul className="grid gap-1 text-sm">
          {recent.map(({ p, number, type, engagementId }) => (
            <li key={p.id}>
              {p.receivedAt.toLocaleDateString('en-GB')} · {formatLkr(p.amountCents)} ·{' '}
              <Link href={`/studio/engagements/${engagementId}`} className="underline">
                {(REVENUE_INVOICE_TYPES as readonly string[]).includes(type) ? TYPE_TEXT[type] : 'Ad deposit'} {number}
              </Link>{' '}
              · {p.method.replace('_', ' ')}
            </li>
          ))}
          {recent.length === 0 && <li className="text-muted-foreground">No payments yet.</li>}
        </ul>
      </section>
    </div>
  );
}

