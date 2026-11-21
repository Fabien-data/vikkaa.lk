import type { Metadata } from 'next';
import Link from 'next/link';
import { config } from '@/lib/config';
import { formatLkr } from '@/lib/money';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'From a three-minute form to a signed deed: how Vikkaa markets and sells your property or vehicle, and what it costs.',
};

const STEPS = [
  ['Tell us about it', 'Fill in a three-minute form. We call you within one working day to talk it through.'],
  ['We visit and price it', 'One of us visits, checks the documents and prepares a market report with real comparable prices and a recommended asking price.'],
  ['You see the plan', 'A proposal with the content plan, the quote and our exclusive agreement. Nothing is paid until you agree.'],
  ['We film it', 'Our own crew shoots photos, drone footage, a walkthrough film and reels in one visit.'],
  ['It goes live everywhere', 'Your listing launches on Facebook, Instagram, TikTok, YouTube and the big portals on the same day, with paid reach.'],
  ['We handle buyers', 'Every enquiry comes to us. We qualify buyers, run viewings or test drives, and negotiate until the deed is signed.'],
] as const;

export default function HowItWorks() {
  const { propertyCents, vehicleCents } = config.priceGuide;
  return (
    <main className="mx-auto w-[min(960px,100%-40px)] py-20">
      <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[1.05] text-brand">How a sale with Vikkaa works</h1>
      <ol className="mt-12 grid gap-8">
        {STEPS.map(([h, p], i) => (
          <li key={h} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-accent/50 pt-6">
            <span className="font-display text-4xl leading-none text-accent">{i + 1}</span>
            <div>
              <h2 className="text-xl font-semibold">{h}</h2>
              <p className="mt-1 max-w-[62ch] text-sage">{p}</p>
            </div>
          </li>
        ))}
      </ol>

      <section id="pricing" className="mt-20 grid gap-6 bg-mist p-8">
        <h2 className="font-display text-3xl text-brand">What it costs</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {propertyCents > 0 && (
            <p className="text-lg">
              Property campaigns from <strong>{formatLkr(propertyCents)}</strong>
            </p>
          )}
          {vehicleCents > 0 && (
            <p className="text-lg">
              Vehicle campaigns from <strong>{formatLkr(vehicleCents)}</strong>
            </p>
          )}
        </div>
        <p className="max-w-[64ch] text-sage">
          You pay an upfront marketing fee and an advertising deposit (spent on your ads, shown live in your portal). When it sells we
          charge a commission, and if it sells within the agreement period your upfront fee is credited against it.
        </p>
        <Link href="/sell" className="justify-self-start rounded-sm bg-brand px-6 py-3.5 font-semibold text-white">
          Get a marketing plan
        </Link>
      </section>
    </main>
  );
}
