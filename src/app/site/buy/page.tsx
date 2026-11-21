import type { Metadata } from 'next';
import { BuyForm } from './buy-form';

export const metadata: Metadata = {
  title: 'Find a property or vehicle with Vikkaa',
  description: 'Tell us what you are looking for. Vikkaa Circle members see new listings two days before everyone else.',
};

export default function BuyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Tell us what you’re looking for</h1>
      <p className="mt-3 text-muted-foreground">
        We’ll match you with listings as they come in. Join Vikkaa Circle to see new ones two days before they go public.
      </p>
      <BuyForm />
    </main>
  );
}
