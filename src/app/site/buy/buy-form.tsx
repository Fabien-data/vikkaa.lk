'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { submitBrief } from './actions';
import type { ActionResult } from '@/lib/form';
import { checkbox, fieldInput as input, fieldLabel, formAlert, legend, submit } from '@/components/site/form-styles';

const KINDS = [
  ['house', 'House'],
  ['apartment', 'Apartment'],
  ['land', 'Land'],
  ['commercial', 'Commercial'],
  ['car', 'Car'],
  ['suv', 'SUV'],
  ['van', 'Van'],
] as const;

export function BuyForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitBrief, undefined);
  return (
    <form action={action} className="grid gap-9">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <label className={fieldLabel}>
          Your name
          <input name="name" autoComplete="name" required className={input} />
        </label>
        <label className={fieldLabel}>
          Phone
          <input name="phone" type="tel" autoComplete="tel" placeholder="077 123 4567" required className={input} />
        </label>
        <label className={fieldLabel}>
          Email (optional)
          <input name="email" type="email" autoComplete="email" className={input} />
        </label>
        <label className={fieldLabel}>
          Areas you like
          <input name="areas" placeholder="Maharagama, Kottawa" className={input} />
        </label>
        <label className={fieldLabel}>
          Budget from (Rs)
          <input name="budgetMinRupees" inputMode="numeric" className={input} />
        </label>
        <label className={fieldLabel}>
          Budget up to (Rs)
          <input name="budgetMaxRupees" inputMode="numeric" className={input} />
        </label>
        <label className={fieldLabel}>
          When do you want to buy?
          <select name="timeline" className={input} defaultValue="0-3m">
            <option value="0-3m">Within 3 months</option>
            <option value="3-6m">In 3 to 6 months</option>
            <option value="6m+">Later than that</option>
          </select>
        </label>
        <label className={fieldLabel}>
          How will you pay?
          <select name="financing" className={input} defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="loan">Bank loan or lease</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend className={legend}>What are you looking for?</legend>
        <div className="flex flex-wrap gap-2.5 text-[15px] font-medium">
          {KINDS.map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2.5 rounded-full border border-brand/15 bg-paper py-2.5 pl-3.5 pr-4.5 transition-colors hover:border-brand/35 has-checked:border-brand-green has-checked:bg-brand-green/10 has-focus-visible:ring-4 has-focus-visible:ring-brand-green/25"
            >
              <input type="checkbox" name="kinds" value={value} className="size-4 accent-brand-green" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 rounded-2xl bg-mist p-5 text-[15px] text-ink-soft">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="privacy" required className={checkbox} />
          <span>
            I agree to the{' '}
            <Link href="/privacy" className="font-semibold text-brand-green underline underline-offset-4">
              privacy notice
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="circle" className={checkbox} />
          Join Vikkaa Circle and see new listings two days early.
        </label>
      </div>
      {state?.error && (
        <p role="alert" className={formAlert}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? 'Sending…' : 'Send my brief'}
      </button>
    </form>
  );
}
