import { requireStaff } from '@/server/auth-guard';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { areaPrices } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';
import { DISTRICTS } from '@/lib/rules';
import { deleteAreaPrice, saveAreaPrice } from './actions';

const KIND_TEXT = { land_perch: 'Land, per perch', house: 'House', apartment: 'Apartment', vehicle: 'Vehicle' } as const;

export default async function AreaPricesPage() {
  await requireStaff();
  const rows = await db.select().from(areaPrices).orderBy(asc(areaPrices.kind), asc(areaPrices.district), asc(areaPrices.area));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Area prices</h1>
        <p className="text-sm text-muted-foreground">
          The price ranges the fit score compares asking prices against. Fill in from public price guides and your own sales.
        </p>
      </div>
      <table className="w-full rounded-md border bg-background text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="p-3">Kind</th>
            <th className="p-3">Where / which</th>
            <th className="p-3">Range</th>
            <th className="p-3">Source</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            async function remove() {
              'use server';
              await deleteAreaPrice(r.id);
            }
            return (
              <tr key={r.id} className="border-t">
                <td className="p-3">{KIND_TEXT[r.kind]}</td>
                <td className="p-3">{r.kind === 'vehicle' ? `${r.make} ${r.model} ${r.year}` : [r.area, r.district].filter(Boolean).join(', ')}</td>
                <td className="p-3">
                  {formatLkr(r.lowCents)} to {formatLkr(r.highCents)}
                </td>
                <td className="p-3 text-muted-foreground">{r.source}</td>
                <td className="p-3 text-right">
                  <form action={remove}>
                    <button className="text-xs text-destructive underline">Delete</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-4 font-semibold">Add a price range</h2>
        <ActionForm action={saveAreaPrice} submitLabel="Add range">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Kind">
              <select name="kind" className={inputClass}>
                {Object.entries(KIND_TEXT).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="District">
              <select name="district" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {DISTRICTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Area" hint="Leave empty for a district-wide range">
              <input name="area" className={inputClass} />
            </Field>
            <Field label="Source">
              <input name="source" placeholder="LPW Q2 2026" className={inputClass} />
            </Field>
            <Field label="Make (vehicles)">
              <input name="make" className={inputClass} />
            </Field>
            <Field label="Model (vehicles)">
              <input name="model" className={inputClass} />
            </Field>
            <Field label="Year (vehicles)">
              <input name="year" className={inputClass} />
            </Field>
            <div />
            <Field label="Low (Rs)">
              <input name="lowRupees" className={inputClass} />
            </Field>
            <Field label="High (Rs)">
              <input name="highRupees" className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
