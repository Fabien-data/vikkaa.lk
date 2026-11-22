import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, comparables, engagements } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { FitBadge } from '@/components/studio/FitBadge';
import { Field, inputClass } from '@/components/studio/Field';
import { Button } from '@/components/ui/button';
import { formatLkr } from '@/lib/money';
import { stageLabel, statusLabel } from '@/lib/enums';
import { addComparable, deleteComparable, recalculateFit, saveEngagement } from '../actions';
import { NoGoForm } from './no-go-form';
import { DocumentsSection } from './documents-section';
import { SignatoriesSection } from './signatories-section';
import { BookingsSection } from './bookings-section';
import { NotesPanel } from '@/components/studio/NotesPanel';
import { TasksPanel } from '@/components/studio/TasksPanel';

const ANSWER_TEXT: Record<string, string> = {
  timeline: 'Timeline',
  documents: 'Documents',
  ownersAgree: 'All owners agree',
  exclusiveOk: 'Will sign exclusive',
  inWesternProvince: 'In Western Province',
  reason: 'Notes from seller',
};

const rupees = (cents: number | null) => (cents ? String(cents / 100) : '');

export default async function EngagementPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const e = await db.query.engagements.findFirst({
    where: eq(engagements.id, id),
    with: { client: true, assets: { orderBy: asc(assets.createdAt) }, comparables: { orderBy: asc(comparables.observedOn) } },
  });
  if (!e) notFound();

  async function recalc() {
    'use server';
    await recalculateFit(id);
  }

  const answers = Object.entries(e.intakeAnswers ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const earlyStage = ['intake', 'call', 'visit', 'proposal'].includes(e.stage);

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <Link href={`/studio/clients/${e.client.id}`} className="text-sm text-muted-foreground">
          {e.client.name}, {e.client.phone}
        </Link>
        <h1 className="text-2xl font-semibold">{e.assets.map((a) => a.title).join(', ') || 'New engagement'}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded bg-foreground px-2 py-0.5 text-background">{stageLabel(e.stage)}</span>
          <span className="capitalize text-muted-foreground">{e.type}</span>
          <FitBadge score={e.fitScore} flags={e.fitFlags} showFlags />
          <form action={recalc}>
            <Button type="submit" size="sm" variant="outline">
              Recalculate fit
            </Button>
          </form>
        </div>
        {e.stage === 'no_go' && (
          <p className="text-sm text-muted-foreground">Not going ahead: {e.noGoReason}</p>
        )}
      </header>

      {answers.length > 0 && (
        <section className="rounded-md border bg-background p-5">
          <h2 className="mb-3 font-semibold">Intake answers</h2>
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {answers.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b py-1">
                <dt className="text-muted-foreground">{ANSWER_TEXT[k] ?? k}</dt>
                <dd>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-4 font-semibold">Terms and plan</h2>
        <ActionForm action={saveEngagement} submitLabel="Save terms">
          <input type="hidden" name="id" value={e.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Upfront fee (Rs)">
              <input name="upfrontFeeRupees" defaultValue={rupees(e.upfrontFeeCents)} className={inputClass} />
            </Field>
            <Field label="Ad budget (Rs)" hint="Paid by the client as a deposit">
              <input name="adBudgetRupees" defaultValue={rupees(e.adBudgetCents)} className={inputClass} />
            </Field>
            <Field label="Commission (%)">
              <input name="commissionPercent" defaultValue={e.commissionRateBp / 100} className={inputClass} />
            </Field>
            <Field label="Exclusive period (days)">
              <input name="exclusiveDays" defaultValue={e.exclusiveDays} className={inputClass} />
            </Field>
            <Field label="Follow-on period (months)">
              <input name="followOnMonths" defaultValue={e.followOnMonths} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="commissionApplies" defaultChecked={e.commissionApplies} /> Commission applies
            </label>
          </div>
          <Field label="Content plan">
            <textarea name="contentPlan" rows={4} defaultValue={e.contentPlan ?? ''} className={inputClass} />
          </Field>
          <Field label="Market notes">
            <textarea name="marketNotes" rows={3} defaultValue={e.marketNotes ?? ''} className={inputClass} />
          </Field>
        </ActionForm>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Assets</h2>
          <Link href={`/studio/assets/new?engagement=${e.id}`} className="text-sm underline">
            Add an asset
          </Link>
        </div>
        <ul className="grid gap-2">
          {e.assets.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm">
              <Link href={`/studio/assets/${a.id}`} className="font-medium hover:underline">
                {a.title}
              </Link>
              <span>{statusLabel(a.status)}</span>
              <span>Asking {formatLkr(a.askingPriceCents)}</span>
              <span className="text-muted-foreground">
                Recommended {a.recommendedPriceCents ? formatLkr(a.recommendedPriceCents) : 'not set'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <BookingsSection engagementId={e.id} assets={e.assets} />

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-3 font-semibold">Comparables (for the market report)</h2>
        <table className="mb-4 w-full text-sm">
          <tbody>
            {e.comparables.map((c) => {
              async function remove() {
                'use server';
                await deleteComparable(c.id, id);
              }
              return (
                <tr key={c.id} className="border-b">
                  <td className="py-2">{c.description}</td>
                  <td className="py-2">{formatLkr(c.priceCents)}</td>
                  <td className="py-2 text-muted-foreground">{c.source}</td>
                  <td className="py-2 text-muted-foreground">{c.observedOn}</td>
                  <td className="py-2 text-right">
                    <form action={remove}>
                      <button className="text-xs text-destructive underline">Remove</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ActionForm action={addComparable} submitLabel="Add comparable" className="grid gap-3 sm:grid-cols-5 sm:items-end">
          <input type="hidden" name="engagementId" value={e.id} />
          <Field label="Description">
            <input name="description" placeholder="3-bed, same lane" className={inputClass} />
          </Field>
          <Field label="Price (Rs)">
            <input name="priceRupees" className={inputClass} />
          </Field>
          <Field label="Source">
            <input name="source" placeholder="LPW ad / sold, our data" className={inputClass} />
          </Field>
          <Field label="Date">
            <input name="observedOn" type="date" className={inputClass} />
          </Field>
        </ActionForm>
      </section>

      <DocumentsSection engagementId={e.id} />

      <SignatoriesSection engagementId={e.id} signed={Boolean(e.signedAt)} />

      {earlyStage && <NoGoForm engagementId={e.id} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <NotesPanel subject={{ type: 'engagement', id: e.id }} />
        <TasksPanel subject={{ type: 'engagement', id: e.id }} />
      </div>
    </div>
  );
}
