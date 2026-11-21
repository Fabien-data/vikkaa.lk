import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { listPortfolio } from '@/server/public-assets';
import { AssetCard } from '@/components/site/AssetCard';
import { PageHero } from '@/components/site/PageHero';
import { Reveal } from '@/components/site/motion/Reveal';
import { TickLine } from '@/components/site/motion/TickLine';
import { STOCK } from '@/components/site/stock';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Properties and vehicles on the market with Vikkaa. Every listing visited, priced and filmed by us.',
};

/** The buyer invitation: the last tile of the grid, or the whole section when nothing is listed yet. */
function Invite({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`bg-glow grain relative flex h-full flex-col justify-between gap-10 overflow-hidden text-white ${
        wide ? 'min-h-[24rem] rounded-[2.5rem] p-8 md:p-14' : 'min-h-[22rem] rounded-[1.5rem] p-8'
      }`}
    >
      <TickLine className={`pointer-events-none absolute text-glow/60 ${wide ? '-right-10 -top-6 w-[min(560px,70%)]' : '-right-8 -top-4 w-64'}`} />
      <p className="eyebrow relative text-mint">Being filmed now</p>
      <div className="relative">
        <h3 className={`max-w-[16ch] font-display leading-[1.05] ${wide ? 'text-[clamp(36px,4.6vw,64px)]' : 'text-[32px]'}`}>
          New listings are being filmed <em className="text-mint">right now.</em>
        </h3>
        <p className="mt-4 max-w-[42ch] text-white/80">
          Tell us what you’re looking for and hear about them first. Vikkaa Circle members see new listings two days before everyone else.
        </p>
        <Link href="/buy" className="btn btn-light mt-7">
          Tell us what you want <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default async function Portfolio() {
  const items = await listPortfolio();
  const live = items.filter((a) => a.status === 'live').length;
  return (
    <main>
      <PageHero
        eyebrow="Portfolio"
        title={['On the market', <>with <em>Vikkaa</em></>]}
        sub="Every listing here was visited, priced and filmed by us. Enquiries come straight to our team."
        photo={STOCK.villaAerialWide}
        outline="Portfolio"
      >
        {live > 0 && (
          <p className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-md">
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-signal opacity-60 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-signal" />
            </span>
            {live} for sale now
          </p>
        )}
      </PageHero>

      <section aria-labelledby="listings-h" className="mx-auto w-[min(1320px,100%-40px)] py-20 md:py-28">
        <h2 id="listings-h" className="eyebrow mb-10 flex items-center gap-4 text-brand-green after:h-px after:flex-1 after:bg-brand/10">
          {items.length ? 'Listings' : 'Coming soon'}
        </h2>
        {items.length ? (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a, i) => (
              <Reveal key={a.id} delay={(i % 3) * 0.08}>
                <AssetCard asset={a} />
              </Reveal>
            ))}
            <Reveal delay={(items.length % 3) * 0.08}>
              <Invite />
            </Reveal>
          </div>
        ) : (
          <Reveal>
            <Invite wide />
          </Reveal>
        )}
      </section>
    </main>
  );
}
