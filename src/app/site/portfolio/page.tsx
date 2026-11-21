import type { Metadata } from 'next';
import Link from 'next/link';
import { listPortfolio } from '@/server/public-assets';
import { AssetCard } from '@/components/site/AssetCard';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Properties and vehicles on the market with Vikkaa. Every listing visited, priced and filmed by us.',
};

export default async function Portfolio() {
  const items = await listPortfolio();
  return (
    <main className="mx-auto w-[min(1160px,100%-40px)] py-20">
      <h1 className="font-display text-[clamp(40px,5vw,64px)] leading-[1.05] text-brand">On the market with Vikkaa</h1>
      <p className="mt-4 max-w-[58ch] text-lg text-sage">Every listing here was visited, priced and filmed by us. Enquiries come straight to our team.</p>
      {items.length ? (
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {items.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      ) : (
        <div className="mt-12 bg-mist p-8">
          <p className="text-lg">New listings are being filmed right now.</p>
          <Link href="/buy" className="mt-4 inline-block underline">
            Tell us what you’re looking for and hear about them first
          </Link>
        </div>
      )}
    </main>
  );
}
