'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { submitSell, type SellState } from './actions';
import { DISTRICTS } from '@/lib/rules';
import { Button } from '@/components/ui/button';

const PROPERTY_KINDS = [
  ['house', 'House'],
  ['apartment', 'Apartment'],
  ['land', 'Land'],
  ['commercial', 'Commercial'],
  ['other', 'Other property'],
] as const;
const VEHICLE_KINDS = [
  ['car', 'Car'],
  ['suv', 'SUV'],
  ['van', 'Van'],
] as const;

const input =
  'w-full rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors?: Record<string, string[]>;
  children: React.ReactNode;
}) {
  const error = errors?.[name]?.[0];
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-sm font-normal text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

export function SellForm() {
  const [state, action, pending] = useActionState<SellState, FormData>(submitSell, undefined);
  const [category, setCategory] = useState<'property' | 'vehicle'>('property');
  const [kind, setKind] = useState('house');
  const errors = state?.fieldErrors;

  return (
    <form action={action} className="mt-10 grid gap-6" noValidate>
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">About you</legend>
        <Field label="Your name" name="name" errors={errors}>
          <input name="name" autoComplete="name" required className={input} />
        </Field>
        <Field label="Phone" name="phone" errors={errors}>
          <input name="phone" type="tel" autoComplete="tel" placeholder="077 123 4567" required className={input} />
        </Field>
        <Field label="Email (optional)" name="email" errors={errors}>
          <input name="email" type="email" autoComplete="email" className={input} />
        </Field>
        <Field label="You are" name="clientType" errors={errors}>
          <select name="clientType" className={input} defaultValue="private">
            <option value="private">Selling my own property or vehicle</option>
            <option value="overseas">Living abroad, selling in Sri Lanka</option>
            <option value="dealer">A vehicle dealer</option>
            <option value="developer">A developer or builder</option>
            <option value="agent">An agent</option>
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">What you’re selling</legend>
        <Field label="Category" name="category" errors={errors}>
          <select
            name="category"
            className={input}
            value={category}
            onChange={(e) => {
              const next = e.target.value as 'property' | 'vehicle';
              setCategory(next);
              setKind(next === 'vehicle' ? 'car' : 'house');
            }}
          >
            <option value="property">Property</option>
            <option value="vehicle">Vehicle</option>
          </select>
        </Field>
        <Field label="Type" name="kind" errors={errors}>
          <select name="kind" className={input} value={kind} onChange={(e) => setKind(e.target.value)}>
            {(category === 'vehicle' ? VEHICLE_KINDS : PROPERTY_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="District" name="district" errors={errors}>
          <select name="district" className={input} defaultValue="Colombo">
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Town or area" name="area" errors={errors}>
          <input name="area" placeholder="Nugegoda" required className={input} />
        </Field>
        <Field label="Asking price (Rs)" name="askingPriceRupees" errors={errors}>
          <input name="askingPriceRupees" inputMode="numeric" placeholder="68,500,000" required className={input} />
        </Field>

        {category === 'vehicle' ? (
          <>
            <Field label="Make" name="make" errors={errors}>
              <input name="make" placeholder="Toyota" className={input} />
            </Field>
            <Field label="Model" name="model" errors={errors}>
              <input name="model" placeholder="Aqua" className={input} />
            </Field>
            <Field label="Year" name="year" errors={errors}>
              <input name="year" inputMode="numeric" placeholder="2017" className={input} />
            </Field>
            <Field label="Mileage (km)" name="mileageKm" errors={errors}>
              <input name="mileageKm" inputMode="numeric" className={input} />
            </Field>
          </>
        ) : kind === 'land' ? (
          <Field label="Land size (perches)" name="landPerches" errors={errors}>
            <input name="landPerches" inputMode="decimal" className={input} />
          </Field>
        ) : (
          <>
            <Field label="Bedrooms" name="bedrooms" errors={errors}>
              <input name="bedrooms" inputMode="numeric" className={input} />
            </Field>
            <Field label="Land size (perches, optional)" name="landPerches" errors={errors}>
              <input name="landPerches" inputMode="decimal" className={input} />
            </Field>
          </>
        )}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">A few quick questions</legend>
        <Field label="When do you need it sold?" name="timeline" errors={errors}>
          <select name="timeline" className={input} defaultValue="0-3m">
            <option value="0-3m">Within 3 months</option>
            <option value="3-6m">In 3 to 6 months</option>
            <option value="6m+">No rush, 6 months or more</option>
            <option value="testing">Just seeing what it’s worth</option>
          </select>
        </Field>
        <Field label="Documents" name="documents" errors={errors}>
          <select name="documents" className={input} defaultValue="clean">
            <option value="clean">Clear deed or vehicle book, nothing owed</option>
            <option value="minor">Mostly ready, a few things to sort out</option>
            <option value="dispute">There is a dispute</option>
            <option value="lease_owed">A loan or lease is still owed</option>
          </select>
        </Field>
        <Field label="Do all owners agree to sell?" name="ownersAgree" errors={errors}>
          <select name="ownersAgree" className={input} defaultValue="yes">
            <option value="yes">Yes, or I’m the only owner</option>
            <option value="no">Not yet</option>
          </select>
        </Field>
        <Field label="Happy to sell only through Vikkaa for the agreement period?" name="exclusiveOk" errors={errors}>
          <select name="exclusiveOk" className={input} defaultValue="yes">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Anything else we should know? (optional)" name="reason" errors={errors}>
            <textarea name="reason" rows={3} className={input} />
          </Field>
        </div>
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        By sending this you agree to our{' '}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>
        .
      </p>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Sending…' : 'Send my details'}
      </Button>
    </form>
  );
}
