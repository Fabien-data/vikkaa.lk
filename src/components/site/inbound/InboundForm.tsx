'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { submitInbound } from '@/app/site/inbound-action';
import type { ActionResult } from '@/lib/form';
import { checkbox, fieldInput, fieldLabel, formAlert, submit } from '../form-styles';

type Props = { segment: 'dealer' | 'developer'; utm: Record<string, string> };

export function InboundForm({ segment, utm }: Props) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitInbound.bind(null, segment), undefined);
  if (state?.ok) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl bg-mist p-5 text-[15px] font-medium text-brand-ink">
        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-green text-white">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        Thank you. One of us will call you within one working day.
      </p>
    );
  }
  const dealer = segment === 'dealer';
  return (
    <form action={action} className="grid gap-4">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className={fieldLabel}>
        {dealer ? 'Dealership name' : 'Company or project name'}
        <input name="name" autoComplete="organization" required className={fieldInput} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldLabel}>
          Your name
          <input name="contactName" autoComplete="name" className={fieldInput} />
        </label>
        <label className={fieldLabel}>
          Phone
          <input name="phone" type="tel" autoComplete="tel" placeholder="077 123 4567" required className={fieldInput} />
        </label>
        <label className={fieldLabel}>
          Email (optional)
          <input name="email" type="email" autoComplete="email" className={fieldInput} />
        </label>
        <label className={fieldLabel}>
          Area
          <input name="area" placeholder={dealer ? 'Nugegoda' : 'Battaramulla'} className={fieldInput} />
        </label>
      </div>
      <label className={fieldLabel}>
        {dealer ? 'How many cars, and what is slow to sell? (optional)' : 'What are you selling? (optional)'}
        <textarea name="note" rows={3} className={fieldInput} />
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="privacy" required className={checkbox} />
        <span>
          I agree to the{' '}
          <Link href="/privacy" className="font-semibold text-brand-green underline underline-offset-4">
            privacy notice
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-soft">
        <input type="checkbox" name="updates" className={checkbox} />
        Send me occasional market updates. I can unsubscribe at any time.
      </label>
      {state?.error && (
        <p role="alert" className={formAlert}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? 'Sending…' : 'Ask for a call back'}
      </button>
    </form>
  );
}
