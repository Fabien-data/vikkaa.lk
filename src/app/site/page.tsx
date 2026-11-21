import Link from 'next/link';
import { listPortfolio } from '@/server/public-assets';
import { AssetCard } from '@/components/site/AssetCard';

const STEPS = [
  ['Tell us about it', 'A three-minute form. We call you within a day.'],
  ['We visit and price it', 'A market report with real comparable prices.'],
  ['We film it', 'Photos, drone, a walkthrough film and reels.'],
  ['It goes live everywhere', 'Facebook, Instagram, TikTok, YouTube and the big portals, all at once.'],
  ['We handle buyers', 'Viewings, offers and negotiation, until the deed is signed.'],
] as const;

export default async function Home() {
  const latest = (await listPortfolio(3)).slice(0, 3);
  return (
    <main>
      <section className="relative grid min-h-[min(80vh,760px)] items-end overflow-hidden bg-brand text-white">
        {latest[0]?.photos[0] && (
          // The hero is always a real Vikkaa shoot: the newest listing's cover photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={latest[0].photos[0].src} srcSet={latest[0].photos[0].srcSet} sizes="100vw" alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,38,32,0.95)_0%,rgba(15,38,32,0.6)_60%,rgba(15,38,32,0.35)_100%)]" />
        <div className="pointer-events-none absolute inset-[18px] border border-accent/70" aria-hidden="true" />
        <div className="relative mx-auto w-[min(1160px,100%-40px)] pb-20 pt-24">
          <h1 className="max-w-[13ch] font-display text-[clamp(44px,7vw,92px)] leading-[1.02]">
            Your property, shown the way it deserves to be seen.
          </h1>
          <p className="mt-6 max-w-[54ch] text-[19px] opacity-90">
            We price it with real market data, film it with our own crew, run it on every platform at once, and handle every buyer
            until the deed is signed.
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <Link href="/sell" className="rounded-sm bg-accent px-6 py-3.5 font-semibold text-brand-ink hover:bg-[#c49a46]">
              Get a marketing plan
            </Link>
            <Link href="/buy" className="rounded-sm border border-white/60 px-6 py-3.5 font-semibold hover:bg-white/10">
              Find a property
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="What you can count on" className="bg-mist">
        <div className="mx-auto grid w-[min(1160px,100%-40px)] gap-8 py-11 md:grid-cols-3">
          {[
            ['Filmed by us, not your phone', 'Photos, drone and a walkthrough film shot by the two of us on every listing.'],
            ['Every enquiry, in front of you', 'Your portal shows each campaign, each enquiry and each offer as it happens.'],
            ['Your fee comes back when it sells', 'Sell within the agreement and the upfront fee is credited against our commission.'],
          ].map(([h, p]) => (
            <div key={h}>
              <h2 className="font-display text-[23px] text-brand">{h}</h2>
              <p className="mt-1.5 max-w-[34ch] text-base text-sage">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="founders-h" className="py-24">
        <div className="mx-auto grid w-[min(1160px,100%-40px)] items-center gap-16 md:grid-cols-[1fr_1.25fr]">
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Property, pricing and negotiation'],
              ['Film, campaigns and digital marketing'],
            ].map(([role]) => (
              <div key={role}>
                <div className="grid aspect-[4/5] place-items-center border-b-[3px] border-accent bg-mist text-sm text-sage">Founder photo</div>
                <h3 className="mt-3.5 text-lg font-semibold">Founder name</h3>
                <p className="text-[15px] text-sage">{role}</p>
              </div>
            ))}
          </div>
          <div>
            <h2 id="founders-h" className="max-w-[18ch] font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] text-brand">
              Two people you can call, from first visit to final signature.
            </h2>
            <p className="mt-4 max-w-[58ch] text-lg text-sage">
              We spent years making campaigns for big brands. Now we put that same craft behind the biggest sale most people ever make,
              and we answer the phone ourselves.
            </p>
            <p className="mt-7 max-w-[36ch] font-display text-[22px] leading-snug">
              “If we wouldn’t put our own names on the campaign, we don’t take the property.”
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-h" className="bg-brand py-24 text-white">
        <div className="mx-auto w-[min(1160px,100%-40px)]">
          <h2 id="how-h" className="font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08]">
            How a sale with Vikkaa works
          </h2>
          <ol className="mt-14 grid gap-6 md:grid-cols-5 md:gap-0">
            {STEPS.map(([h, p], i) => (
              <li key={h} className="border-t border-accent/60 pr-5 pt-6">
                <span className="block font-display text-[40px] leading-none text-accent">{i + 1}</span>
                <h3 className="mt-4 text-[17px] font-semibold">{h}</h3>
                <p className="mt-1.5 text-[15px] text-white/70">{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {latest.length > 0 && (
        <section aria-labelledby="pf-h" className="py-24">
          <div className="mx-auto w-[min(1160px,100%-40px)]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 id="pf-h" className="font-display text-[clamp(34px,4.4vw,52px)] leading-[1.08] text-brand">
                On the market with Vikkaa
              </h2>
              <Link href="/portfolio" className="rounded-sm bg-brand px-6 py-3.5 font-semibold text-white">
                See the full portfolio
              </Link>
            </div>
            <div className="mt-11 grid gap-7 md:grid-cols-3">
              {latest.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section aria-label="Get started" className="grid md:grid-cols-2">
        <div className="bg-mist px-5 py-16 md:px-14">
          <h2 className="font-display text-4xl">Selling a property or a vehicle?</h2>
          <p className="mt-3 max-w-[42ch] text-sage">
            Tell us about it in three minutes. If it’s a fit, we’ll visit, price it and show you the plan before you pay anything.
          </p>
          <Link href="/sell" className="mt-6 inline-block rounded-sm bg-brand px-6 py-3.5 font-semibold text-white">
            Get a marketing plan
          </Link>
        </div>
        <div className="bg-brand-ink px-5 py-16 text-white md:px-14">
          <h2 className="font-display text-4xl">Looking to buy?</h2>
          <p className="mt-3 max-w-[42ch] text-white/80">Tell us what you want. Vikkaa Circle members see new listings two days before everyone else.</p>
          <Link href="/buy" className="mt-6 inline-block rounded-sm bg-accent px-6 py-3.5 font-semibold text-brand-ink">
            Tell us what you want
          </Link>
        </div>
      </section>
    </main>
  );
}
