import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/server/auth-guard';
import {
  AGREEMENT_TITLES,
  AgreementTemplateError,
  CLAUSE_CONDITIONS,
  CLAUSE_VARS,
  DECIDE_MARKER,
  getAgreementTemplate,
  renderClauses,
} from '@/server/agreement-templates';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { Button } from '@/components/ui/button';
import { approve, saveClauses, startNewVersion } from '../actions';

const SAMPLE = {
  commissionApplies: true,
  commissionRateBp: 300,
  commissionMinCents: 0,
  upfrontFeeCents: 7_500_000,
  adBudgetCents: 5_000_000,
  monthlyFeeCents: 15_000_000,
  exclusiveDays: 90,
  followOnMonths: 6,
  unitsPerMonth: 8,
  client: { name: 'Sample Client' },
};

export default async function AgreementVersionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const t = await getAgreementTemplate(id).catch((err) => {
    if (err instanceof AgreementTemplateError) notFound();
    throw err;
  });
  const preview = renderClauses(t.clauses, SAMPLE);
  const undecided = t.clauses.filter((c) => c.includes(DECIDE_MARKER)).length;
  async function copy() {
    'use server';
    await startNewVersion(id);
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link href="/studio/settings/agreements" className="text-sm text-muted-foreground">
          ← Agreement wording
        </Link>
        <h1 className="page-title">
          {AGREEMENT_TITLES[t.kind]}, version {t.version}
        </h1>
        <p className="text-sm">
          {t.approvedAt ? (
            <span className="chip bg-emerald-100 text-emerald-900">
              Approved by {t.approvedBy} ({t.approvalReference}) on {t.approvedAt.toLocaleDateString('en-GB')}. Read-only.
            </span>
          ) : (
            <span className="chip bg-amber-100 text-amber-900">Draft: not signable</span>
          )}
        </p>
      </header>

      {!t.approvedAt ? (
        <section className="panel p-5">
          <h2 className="mb-2 font-semibold">Clauses</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            One clause per paragraph, with a blank line between clauses. Start a clause with a condition to include it only when it applies:{' '}
            {CLAUSE_CONDITIONS.map((c) => `[if ${c}]`).join(' ')}. Placeholders: {CLAUSE_VARS.map((v) => `{${v}}`).join(' ')}.
          </p>
          <ActionForm action={saveClauses} submitLabel="Save draft">
            <input type="hidden" name="id" value={t.id} />
            <Field label="Clauses">
              <textarea name="clauses" rows={24} defaultValue={t.clauses.join('\n\n')} className={`${inputClass} font-mono text-xs`} />
            </Field>
            <Field label="Notes (internal)">
              <input name="notes" defaultValue={t.notes ?? ''} className={inputClass} />
            </Field>
          </ActionForm>
        </section>
      ) : (
        <form action={copy}>
          <Button type="submit" variant="outline">
            Start a new version from this one
          </Button>
        </form>
      )}

      <section className="panel p-5">
        <h2 className="mb-2 font-semibold">Preview with sample terms</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          3% commission, Rs 75,000 fee, Rs 50,000 deposit, Rs 150,000 a month for 8 listings, 90 days, 6-month tail.
        </p>
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          {preview.map((c, i) => (
            <li key={i} className={c.includes(DECIDE_MARKER) ? 'text-amber-800' : ''}>
              {c}
            </li>
          ))}
        </ol>
      </section>

      {!t.approvedAt && (
        <section className="panel border-emerald-300 p-5">
          <h2 className="mb-2 font-semibold">Lawyer&rsquo;s approval</h2>
          {undecided > 0 && (
            <p className="mb-3 text-sm text-amber-800">
              {undecided} clause{undecided === 1 ? '' : 's'} still say &ldquo;{DECIDE_MARKER}&rdquo;. Replace them with the agreed wording before approving.
            </p>
          )}
          <ActionForm action={approve} submitLabel="Stamp as approved" className="grid gap-3">
            <input type="hidden" name="id" value={t.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Lawyer's name">
                <input name="lawyerName" className={inputClass} />
              </Field>
              <Field label="Written confirmation" hint="Email date, letter number…">
                <input name="reference" className={inputClass} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="confirmed" className="mt-1" />
              The lawyer approved this exact wording in writing.
            </label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
