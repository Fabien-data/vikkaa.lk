'use client';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SecurityPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enable(form: FormData) {
    const { data, error } = await authClient.twoFactor.enable({ password: String(form.get('password')) });
    if (error || !data || !('totpURI' in data)) return setMessage(error?.message ?? 'Could not start setup');
    setSecret(new URL(data.totpURI).searchParams.get('secret'));
  }

  async function verify(form: FormData) {
    const { error } = await authClient.twoFactor.verifyTotp({ code: String(form.get('code')) });
    setMessage(error ? (error.message ?? 'Invalid code') : 'Two-factor sign-in is on.');
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="page-title">Two-factor sign-in</h1>
      {!secret ? (
        <form action={enable} className="space-y-3">
          <Label htmlFor="password">Confirm your password</Label>
          <Input id="password" name="password" type="password" required />
          <Button type="submit">Start setup</Button>
        </form>
      ) : (
        <form action={verify} className="space-y-3">
          <p className="text-sm">
            In Google Authenticator (or similar) choose <b>Enter a setup key</b>, name it Vikkaa, and enter:
          </p>
          <code className="block rounded bg-muted p-3 font-mono text-sm break-all">{secret}</code>
          <Label htmlFor="code">Code from the app</Label>
          <Input id="code" name="code" inputMode="numeric" required />
          <Button type="submit">Turn on</Button>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
