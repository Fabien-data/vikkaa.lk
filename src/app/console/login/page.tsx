'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'totp'>('password');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPassword(form: FormData) {
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setBusy(false);
    if (error) return setError(error.message ?? 'Sign-in failed');
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) return setStep('totp');
    router.push('/studio');
  }

  async function onTotp(form: FormData) {
    setBusy(true);
    setError(null);
    const { error } = await authClient.twoFactor.verifyTotp({ code: String(form.get('code')) });
    setBusy(false);
    if (error) return setError(error.message ?? 'Invalid code');
    router.push('/studio');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="grid justify-items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Vikkaa" width={136} height={68} className="h-12 w-auto" />
          <CardTitle>Studio sign-in</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'password' ? (
            <form action={onPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                Sign in
              </Button>
            </form>
          ) : (
            <form action={onTotp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Authenticator code</Label>
                <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                Verify
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
