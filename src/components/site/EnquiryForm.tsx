'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { submitEnquiry } from '@/app/site/enquire-action';
import type { ActionResult } from '@/lib/form';
import { checkbox, fieldInput as input, fieldLabel, formAlert, submit } from './form-styles';

export function EnquiryForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitEnquiry.bind(null, slug), undefined);
  if (state?.ok) {
    return (
      <p role="status" className="mt-6 flex items-start gap-3 rounded-2xl bg-mist p-5 text-[15px] font-medium text-brand-ink">
        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-green text-white">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        Thanks — Vikkaa will contact you shortly.
      </p>
    );
  }
  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className={fieldLabel}>
        Your name
        <input name="name" autoComplete="name" required className={input} />
      </label>
      <label className={fieldLabel}>
        Phone
        <input name="phone" type="tel" autoComplete="tel" placeholder="077 123 4567" required className={input} />
      </label>
      <label className={fieldLabel}>
        Message (optional)
        <textarea name="message" rows={3} defaultValue="I’d like to arrange a viewing." className={input} />
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
        <input type="checkbox" name="circle" className={checkbox} />
        Join Vikkaa Circle and see new listings two days early.
      </label>
      {state?.error && (
        <p role="alert" className={formAlert}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? 'Sending…' : 'Send enquiry'}
      </button>
      <p className="text-center text-[13px] text-ink-soft">You’ll be contacted by Vikkaa, not the seller.</p>
    </form>
  );
}
