'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STOCK } from '@/components/site/stock';

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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section aria-hidden="true" className="bg-glow grain relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={STOCK.villaAerial.src}
          srcSet={STOCK.villaAerial.srcSet}
          sizes="55vw"
          alt=""
          className="absolute inset-0 size-full object-cover opacity-35 mix-blend-luminosity motion-safe:animate-ken-burns"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(3_21_15/0.2),rgb(3_21_15/0.85))]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.png" alt="" width={136} height={68} className="h-9 w-auto self-start" />
          <div className="grid max-w-lg gap-5">
            <p className="eyebrow text-mint">Vikkaa Studio</p>
            <p className="font-display text-[clamp(44px,4.4vw,72px)] leading-[0.95] motion-safe:animate-rise">
              Every sale, <em className="text-mint">run from here.</em>
            </p>
            <p className="max-w-[40ch] text-white/70">Prospects, shoots, campaigns, buyers and money. One room for the two of you.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm motion-safe:animate-rise">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Vikkaa" width={136} height={68} className="mb-10 h-10 w-auto lg:hidden" />
          <p className="eyebrow text-brand-green">{step === 'password' ? 'Studio sign-in' : 'One more step'}</p>
          <h1 className="page-title mt-3">{step === 'password' ? <>Welcome <em className="text-brand-green">back.</em></> : <>Check your <em className="text-brand-green">authenticator.</em></>}</h1>
          <div className="panel mt-8 p-6">
            {step === 'password' ? (
              <form action={onPassword} className="space-y-5">
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
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            ) : (
              <form action={onTotp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="code">Authenticator code</Label>
                  <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="text-center text-lg tracking-[0.4em]" />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? 'Checking…' : 'Verify'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
