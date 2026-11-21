import type { Metadata } from 'next';
import { SellForm } from './sell-form';

export const metadata: Metadata = {
  title: 'Sell with Vikkaa',
  description: 'Tell us about your property or vehicle. If it is a fit, we visit, price it and show you the plan.',
};

export default function SellPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Tell us what you’re selling</h1>
      <p className="mt-3 text-muted-foreground">
        It takes about three minutes. If it’s a fit, we’ll call within a day, visit, price it and show you the plan
        before you pay anything.
      </p>
      <SellForm />
    </main>
  );
}
