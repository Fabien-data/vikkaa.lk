'use client';
import { useActionState, useState, useTransition } from 'react';
import { requestCode, submitSignature, type CodeState, type SignState } from './actions';
import { Button } from '@/components/ui/button';

const input =
  'w-full rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function SignForm({ id, exp, sig }: { id: string; exp: string; sig: string }) {
  const [code, setCode] = useState<CodeState>(undefined);
  const [sending, startSending] = useTransition();
  const [state, action, signing] = useActionState<SignState, FormData>(submitSignature, undefined);

  if (state?.signed) {
    return (
      <p role="status" className="mt-8 rounded-md bg-emerald-50 p-4 text-emerald-900">
        Signed. Thank you.{' '}
        {state.allSigned
          ? 'Everyone has now signed, and Vikkaa will send you the signed copy.'
          : 'We are waiting for the other signatories.'}
      </p>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="exp" value={exp} />
      <input type="hidden" name="sig" value={sig} />
      <label className="grid gap-1.5 text-sm font-medium">
        Full name
        <input name="name" autoComplete="name" required className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        NIC or passport number
        <input name="idNumber" required className={input} />
      </label>
      <div className="grid gap-2">
        <Button type="button" variant="outline" disabled={sending} onClick={() => startSending(async () => setCode(await requestCode(id, exp, sig)))}>
          {code?.sent ? 'Send a new code' : 'Send me a code'}
        </Button>
        {code?.sent && (
          <p role="status" className="text-sm text-muted-foreground">
            {code.sent}
          </p>
        )}
        {code?.error && (
          <p role="alert" className="text-sm text-destructive">
            {code.error}
          </p>
        )}
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        6-digit code
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className={input} />
      </label>
      <p className="text-sm text-muted-foreground">By signing you agree to the terms in the agreement above.</p>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={signing}>
        {signing ? 'Signing…' : 'Sign the agreement'}
      </Button>
    </form>
  );
}
