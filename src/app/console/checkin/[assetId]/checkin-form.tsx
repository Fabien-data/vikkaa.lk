'use client';
import { useActionState } from 'react';
import { submitCheckin } from './actions';
import type { ActionResult } from '@/lib/form';
import { Button } from '@/components/ui/button';

const input =
  'w-full rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function CheckinForm({ assetId, kind }: { assetId: string; kind: 'property' | 'vehicle' }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitCheckin, undefined);

  if (state?.ok) {
    return (
      <div className="mt-8 grid gap-4">
        <p role="status" className="rounded-md bg-emerald-50 p-4 text-emerald-900">
          Thank you, you’re checked in.
        </p>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Check in the next person
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="assetId" value={assetId} />
      <label className="grid gap-1.5 text-sm font-medium">
        Your name
        <input name="name" autoComplete="name" required className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Phone
        <input name="phone" type="tel" autoComplete="tel" required className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        NIC or passport number
        <input name="nic" required className={input} />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirmIntroduced" required className="mt-1" />I confirm Vikkaa introduced me to this{' '}
        {kind === 'vehicle' ? 'vehicle' : 'property'}.
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        Check in
      </Button>
    </form>
  );
}
