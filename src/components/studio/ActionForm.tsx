'use client';
import { useActionState } from 'react';
import type { ActionResult } from '@/lib/form';
import { Button } from '@/components/ui/button';

/** A form bound to a `(prev, formData)` server action that shows its error or a saved note. */
export function ActionForm({
  action,
  submitLabel,
  children,
  className = 'grid gap-4',
  encType,
}: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
  encType?: 'multipart/form-data';
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className} encType={encType}>
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && !pending && (
          <p role="status" className="text-sm text-emerald-700">
            Saved
          </p>
        )}
      </div>
    </form>
  );
}
