'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { submitBrief } from './actions';
import type { ActionResult } from '@/lib/form';
import { Button } from '@/components/ui/button';

const input =
  'w-full rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
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
    <form action={action} className="mt-10 grid gap-5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Your name
          <input name="name" autoComplete="name" required className={input} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Phone
          <input name="phone" type="tel" autoComplete="tel" placeholder="077 123 4567" required className={input} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Email (optional)
          <input name="email" type="email" autoComplete="email" className={input} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Areas you like
          <input name="areas" placeholder="Maharagama, Kottawa" className={input} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Budget from (Rs)
          <input name="budgetMinRupees" inputMode="numeric" className={input} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Budget up to (Rs)
          <input name="budgetMaxRupees" inputMode="numeric" className={input} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          When do you want to buy?
          <select name="timeline" className={input} defaultValue="0-3m">
            <option value="0-3m">Within 3 months</option>
            <option value="3-6m">In 3 to 6 months</option>
            <option value="6m+">Later than that</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          How will you pay?
          <select name="financing" className={input} defaultValue="cash">
            <option value="cash">Cash</option>
            <option value="loan">Bank loan or lease</option>
            <option value="unsure">Not sure yet</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">What are you looking for?</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {KINDS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="checkbox" name="kinds" value={value} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="privacy" required className="mt-1" />
        <span>
          I agree to the{' '}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="circle" className="mt-1" />
        Join Vikkaa Circle and see new listings two days early.
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Sending…' : 'Send'}
      </Button>
    </form>
  );
}
