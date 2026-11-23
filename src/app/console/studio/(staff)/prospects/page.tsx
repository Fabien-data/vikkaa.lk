import Link from 'next/link';
import { requireStaff } from '@/server/auth-guard';
import { listProspects } from '@/server/prospects';
import { PROSPECT_STATUSES, type ProspectStatus } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { addProspect } from './actions';
import { SEGMENT_TEXT, STATUS_TEXT, SegmentSelect } from './prospect-fields';

const when = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: 'numeric', month: 'short' }) : '';

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff();
  const { status: rawStatus, q } = await searchParams;
  const status = PROSPECT_STATUSES.includes(rawStatus as ProspectStatus) ? (rawStatus as ProspectStatus) : undefined;
  const rows = await listProspects({ status, q });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Prospects</h1>
        <form className="flex gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="sr-only" htmlFor="prospect-search">
            Search prospects
          </label>
          <input id="prospect-search" name="q" defaultValue={q} placeholder="Search name, phone or area" className={inputClass} />
        </form>
      </div>

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-3 font-semibold">Quick add</h2>
        <ActionForm action={addProspect} submitLabel="Add prospect" className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Business or person">
              <input name="name" required className={inputClass} placeholder="Lanka Auto Traders" />
            </Field>
            <Field label="Who they are">
              <SegmentSelect />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" inputMode="tel" className={inputClass} placeholder="077 123 4567" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Area">
              <input name="area" className={inputClass} placeholder="Nugegoda" />
            </Field>
          </div>
          <Field label="Note">
            <input name="stockNote" className={inputClass} placeholder="About 40 cars, mostly hybrids, slow since June" />
          </Field>
        </ActionForm>
      </section>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2 text-sm">
        <Link href="/studio/prospects" className={`rounded-full px-3 py-1 ${!status ? 'bg-foreground text-background' : 'border bg-background'}`} aria-current={!status ? 'page' : undefined}>
          All
        </Link>
        {PROSPECT_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/studio/prospects?status=${s}`}
            className={`rounded-full px-3 py-1 ${status === s ? 'bg-foreground text-background' : 'border bg-background'}`}
            aria-current={status === s ? 'page' : undefined}
          >
            {STATUS_TEXT[s]}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto">
        <table className="w-full rounded-md border bg-background text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th scope="col" className="p-3">Name</th>
              <th scope="col" className="p-3">Who</th>
              <th scope="col" className="p-3">Area</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">Next step</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <Link href={`/studio/prospects/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="p-3">{SEGMENT_TEXT[p.segment]}</td>
                <td className="p-3">{p.area ?? p.district ?? ''}</td>
                <td className="p-3">{STATUS_TEXT[p.status]}</td>
                <td className="p-3">{when(p.nextActionAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No prospects yet. Add the 30 dealers and developers you want to pitch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
