'use client';
import { useActionState } from 'react';
import { Check } from 'lucide-react';
import type { ActionResult } from '@/lib/form';
import { fieldInput, fieldLabel, formAlert, submit } from '@/components/site/form-styles';
import { requestCallAction } from './actions';

export function RequestCallForm({ token, phone }: { token: string; phone: string | null }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(requestCallAction.bind(null, token), undefined);
  if (state?.ok) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-2xl bg-mist p-5 text-[15px] font-medium text-brand-ink">
        <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-green text-white">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
        Thank you. One of us will call you today.
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <label className={fieldLabel}>
        Best number to call
        <input name="phone" type="tel" autoComplete="tel" defaultValue={phone ?? ''} placeholder="077 123 4567" className={fieldInput} />
      </label>
      <label className={fieldLabel}>
        A good time, or a question (optional)
        <textarea name="note" rows={3} className={fieldInput} />
      </label>
      {state?.error && (
        <p role="alert" className={formAlert}>
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={submit}>
        {pending ? 'Sending…' : 'Request a call'}
      </button>
    </form>
  );
}
