import { requireStaff } from '@/server/auth-guard';
import { listPackages } from '@/server/packages';
import { PACKAGE_KINDS, type Package } from '@/db/schema';
import { ASSET_CATEGORIES } from '@/lib/enums';
import { formatLkr } from '@/lib/money';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { savePackageAction } from '../actions';
import { SettingsNav } from '../settings-nav';

const SEGMENTS = ['dealer', 'developer', 'private', 'overseas'] as const;
const KIND_TEXT = { upfront: 'Upfront fee', retainer: 'Monthly retainer', pilot: 'Pilot (fixed price)' } as const;
const rupees = (cents: number | null | undefined) => (cents ? String(cents / 100) : '');

function PackageFields({ p }: { p?: Package }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Name">
          <input name="name" defaultValue={p?.name} placeholder="Dealer retainer, 8 cars" className={inputClass} />
        </Field>
        <Field label="For">
          <select name="segment" defaultValue={p?.segment ?? 'dealer'} className={inputClass}>
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select name="category" defaultValue={p?.category ?? 'property'} className={inputClass}>
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kind">
          <select name="kind" defaultValue={p?.kind ?? 'upfront'} className={inputClass}>
            {PACKAGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_TEXT[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price (Rs)" hint="Per month for a retainer">
          <input name="priceRupees" defaultValue={rupees(p?.priceCents)} className={inputClass} />
        </Field>
        <Field label="Units a month" hint="Retainers only">
          <input name="unitsPerMonth" defaultValue={p?.unitsPerMonth ?? ''} className={inputClass} />
        </Field>
        <Field label="Exclusive days" hint="Blank keeps the default">
          <input name="exclusiveDays" defaultValue={p?.exclusiveDays ?? ''} className={inputClass} />
        </Field>
        <Field label="Follow-on months" hint="Blank keeps the default">
          <input name="followOnMonths" defaultValue={p?.followOnMonths ?? ''} className={inputClass} />
        </Field>
        <Field label="Commission (%)" hint="Blank keeps the default, 0 for none">
          <input name="commissionPercent" defaultValue={p?.commissionBp != null ? p.commissionBp / 100 : ''} className={inputClass} />
        </Field>
        <Field label="Minimum commission (Rs)">
          <input name="commissionMinRupees" defaultValue={rupees(p?.commissionMinCents)} className={inputClass} />
        </Field>
        <Field label="Order">
          <input name="sortOrder" defaultValue={p?.sortOrder ?? 0} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="founding" defaultChecked={p?.founding} /> Founding terms (capped)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publicFrom" defaultChecked={p?.publicFrom} /> Use for the public &ldquo;from Rs&rdquo; price
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={p ? p.active : true} /> Active
        </label>
      </div>
    </>
  );
}

export default async function PricesPage() {
  await requireStaff();
  const all = await listPackages();
  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="page-title">Price book</h1>
        <SettingsNav current="/studio/settings/prices" />
        <p className="max-w-3xl text-sm text-muted-foreground">
          Set each offer once. Applying a package to an engagement copies its terms, so later price changes never alter a quote already sent.
        </p>
      </header>

      {all.map((p) => (
        <section key={p.id} className={`panel p-5 ${p.active ? '' : 'opacity-60'}`}>
          <h2 className="mb-4 flex flex-wrap items-center gap-3 font-semibold">
            {p.name}
            <span className="text-sm font-normal text-muted-foreground">
              {formatLkr(p.priceCents)}
              {p.kind === 'retainer' ? ' / month' : ''} · {p.segment}
            </span>
            {p.founding && <span className="chip bg-amber-100 text-xs">Founding</span>}
          </h2>
          <ActionForm action={savePackageAction} submitLabel="Save package">
            <PackageFields p={p} />
          </ActionForm>
        </section>
      ))}

      <section className="panel border-dashed p-5">
        <h2 className="mb-4 font-semibold">Add a package</h2>
        <ActionForm action={savePackageAction} submitLabel="Add package">
          <PackageFields />
        </ActionForm>
      </section>
    </div>
  );
}
