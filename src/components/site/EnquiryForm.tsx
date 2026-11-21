'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { submitEnquiry } from '@/app/site/enquire-action';
import type { ActionResult } from '@/lib/form';

const input = 'w-full rounded-sm border border-[#c9d3cc] bg-white px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-brand-green';

export function EnquiryForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitEnquiry.bind(null, slug), undefined);
  if (state?.ok) {
    return (
      <p role="status" className="mt-6 rounded-sm bg-mist p-4">
        Thanks — Vikkaa will contact you shortly.
      </p>
    );
  }
  return (
    <form action={action} className="mt-6 grid gap-3.5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="grid gap-1.5 text-sm font-medium">
        Your name
        <input name="name" autoComplete="name" required className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Phone
        <input name="phone" type="tel" autoComplete="tel" placeholder="077 123 4567" required className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Message (optional)
        <textarea name="message" rows={3} defaultValue="I’d like to arrange a viewing." className={input} />
      </label>
      <label className="flex items-start gap-2.5 text-sm text-sage">
        <input type="checkbox" name="privacy" required className="mt-1" />
        <span>
          I agree to the{' '}
          <Link href="/privacy" className="underline">
            privacy notice
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm text-sage">
        <input type="checkbox" name="circle" className="mt-1" />
        Join Vikkaa Circle and see new listings two days early.
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-sm bg-brand px-6 py-3.5 font-semibold text-white hover:bg-[#1f4a3c] disabled:opacity-60">
        {pending ? 'Sending…' : 'Send enquiry'}
      </button>
      <p className="text-[13px] text-sage">You’ll be contacted by Vikkaa, not the seller.</p>
    </form>
  );
}
