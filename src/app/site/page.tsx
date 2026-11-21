import Link from 'next/link';
import { ArrowUpRight, Clapperboard, HandCoins, Radio } from 'lucide-react';
import { listPortfolio } from '@/server/public-assets';
import { AssetCard } from '@/components/site/AssetCard';
import { STOCK, stockUrl, type StockPhoto } from '@/components/site/stock';
import { TICK_PATH, TICK_VIEWBOX } from '@/components/site/tick';
import { HeroCanvas, EveryScreen, IslandMap } from '@/components/site/three';
import { Reveal } from '@/components/site/motion/Reveal';
import { SplitReveal } from '@/components/site/motion/SplitReveal';
import { CountUp } from '@/components/site/motion/CountUp';
import { TickLine } from '@/components/site/motion/TickLine';
import { ScrubWords } from '@/components/site/home/ScrubWords';
import { ShootGallery } from '@/components/site/home/ShootGallery';
import { Steps } from '@/components/site/home/Steps';
import { Parallax } from '@/components/site/home/Parallax';

const wrap = 'mx-auto w-[min(1320px,100%-40px)]';
const h2 = 'font-display text-[clamp(40px,5vw,76px)] leading-[1]';

const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'Property portals', 'Google'];

const PROMISES = [
  { icon: Clapperboard, title: 'Filmed by us, not your phone', line: 'Photos, drone and a walkthrough film, shot by the two of us on our own Sony cameras and DJI drones.' },
  { icon: Radio, title: 'Every enquiry, in front of you', line: 'Your client portal shows each campaign, each enquiry and each offer as it happens.', live: true },
  { icon: HandCoins, title: 'Your fee comes back when it sells', line: 'Sell within the agreement period and your upfront fee is credited against our commission.' },
];

// Only true facts about the service (design/DIRECTION.md, honesty rule).
const FACTS = [
  { value: 1, label: 'visit to film everything' },
  { value: 5, suffix: '+', label: 'platforms on launch day' },
  { value: 1, label: 'working day to call you back' },
  { value: 0, prefix: 'Rs ', label: 'until you approve the plan' },
];

const EVERY_SCREEN = [STOCK.villaAhangama, STOCK.villaAerial, STOCK.openAirLiving, STOCK.livingRoom, STOCK.coastMirissa, STOCK.tropicalHouse].map((p) =>
  stockUrl(p, 1080),
);

function Photo({ photo, sizes, className = 'size-full object-cover' }: { photo: StockPhoto; sizes: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photo.src} srcSet={photo.srcSet} sizes={sizes} alt={photo.alt} loading="lazy" className={className} />;
}

const Tick = ({ className }: { className: string }) => (
  <svg viewBox={TICK_VIEWBOX} aria-hidden="true" className={className}>
    <path d={TICK_PATH} fill="currentColor" />
  </svg>
);

const LiveDot = () => (
  <span aria-hidden="true" className="relative flex size-2">
    <span className="absolute inset-0 rounded-full bg-signal opacity-70 motion-safe:animate-ping" />
    <span className="relative size-2 rounded-full bg-signal" />
  </span>
);

export default async function Home() {
  const latest = (await listPortfolio(3)).slice(0, 3);
  return (
    <main>
      <Hero />

      {/* Where every campaign goes live */}
      <section aria-labelledby="platforms-h" className="overflow-hidden border-b border-brand/10 pb-14 pt-16 md:pb-20 md:pt-24">
        <div className={`${wrap} flex flex-wrap items-baseline justify-between gap-3`}>
          <h2 id="platforms-h" className="eyebrow text-brand-green">
            One campaign, every platform
          </h2>
          <p className="text-[15px] text-ink-soft">Same story, cut for each screen, live at the same time.</p>
        </div>
        <div className="mt-8 flex w-max motion-safe:animate-marquee hover:[animation-play-state:paused] md:mt-12">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-center">
              {PLATFORMS.map((p, i) => (
                <li key={p} className="flex items-center">
                  <span
                    className={`whitespace-nowrap px-6 font-display text-[clamp(56px,8.5vw,136px)] leading-[1.1] md:px-10 ${
                      i % 2 ? 'text-outline [--outline:rgb(11_40_30/0.45)]' : 'text-brand-ink'
                    }`}
                  >
                    {p}
                  </span>
                  <Tick className="w-[clamp(22px,2.6vw,40px)] text-brand-green" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* Manifesto and the three promises */}
      <section aria-labelledby="why-h" className="relative overflow-hidden pb-24 pt-28 md:pb-32 md:pt-44">
        <p aria-hidden="true" className="text-outline pointer-events-none absolute -left-[3vw] top-6 select-none font-display text-[clamp(150px,30vw,480px)] leading-none [--outline:rgb(11_40_30/0.2)] md:top-12">
          Craft
        </p>
        <TickLine className="pointer-events-none absolute -right-24 top-28 hidden w-[min(640px,70vw)] text-brand-green/30 md:block" />
        <div className={`relative ${wrap}`}>
          <h2 id="why-h" className="eyebrow text-brand-green">
            Why Vikkaa
          </h2>
          <ScrubWords className="mt-8 max-w-[24ch] font-display text-[clamp(36px,5.4vw,84px)] leading-[1.04] text-brand-ink md:mt-12">
            Most property in Sri Lanka is sold with a phone photo and a classified ad. We bring the <em className="text-brand-green">craft</em> of a
            brand campaign to the biggest sale of your life.
          </ScrubWords>
          <Reveal as="ul" stagger={0.12} className="mt-24 grid gap-12 md:mt-28 md:grid-cols-3 md:gap-8">
            {PROMISES.map(({ icon: Icon, title, line, live }, i) => (
              <li key={title} className="border-t border-brand/15 pt-7">
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl text-brand-green">{String(i + 1).padStart(2, '0')}</span>
                  {live ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
                      <LiveDot /> Live portal
                    </span>
                  ) : (
                    <Icon className="size-6 text-brand-green" strokeWidth={1.3} aria-hidden="true" />
                  )}
                </div>
                <h3 className="mt-7 font-display text-[clamp(28px,2.5vw,36px)] leading-[1.08]">{title}</h3>
                <p className="mt-3 max-w-[36ch] text-[17px] text-ink-soft">{line}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <EveryScreen images={EVERY_SCREEN} />

      <ShootGallery />

      {/* How it works */}
      <section aria-labelledby="how-h" className="px-3 md:px-6">
        <div className="bg-glow grain relative overflow-clip rounded-[2.5rem] text-white">
          <div className={`relative grid gap-16 py-24 md:grid-cols-[0.9fr_1.1fr] md:gap-10 md:py-40 ${wrap} md:w-[min(1320px,100%-96px)]`}>
            <div className="md:sticky md:top-36 md:self-start">
              <p className="eyebrow text-mint">How it works</p>
              <SplitReveal id="how-h" className={`mt-6 max-w-[12ch] ${h2}`}>
                From first call to a signed <em className="text-mint">deed.</em>
              </SplitReveal>
              <p className="mt-7 max-w-[38ch] text-lg text-white/75">
                Five steps, two people, one campaign. You can follow every one of them in your client portal.
              </p>
              <Link href="/how-it-works" className="btn btn-ghost mt-10">
                The whole process, and what it costs <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <Steps />
          </div>
        </div>
      </section>

      {/* Honest numbers */}
      <section aria-labelledby="facts-h" className="py-24 md:py-36">
        <div className={wrap}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SplitReveal id="facts-h" className={h2}>
              Numbers we can <em className="text-brand-green">promise.</em>
            </SplitReveal>
            <p className="max-w-[40ch] text-[17px] text-ink-soft">No inflated sales counts. Just what we commit to on every listing.</p>
          </div>
          <Reveal as="ul" stagger={0.1} className="mt-14 grid grid-cols-2 border-t border-brand/15 md:mt-20 md:grid-cols-4">
            {FACTS.map((f) => (
              <li key={f.label} className="border-b border-brand/15 py-8 pr-4 even:border-l even:pl-5 md:border-b-0 md:border-l md:px-8 md:py-10 md:first:border-l-0 md:first:pl-0">
                <CountUp value={f.value} prefix={f.prefix} suffix={f.suffix} className="block font-display text-[clamp(72px,9vw,144px)] leading-[0.9] text-brand-ink" />
                <p className="mt-4 flex items-start gap-2.5 text-[16px] leading-snug text-ink-soft">
                  <Tick className="mt-1 w-4 shrink-0 text-brand-green" />
                  {f.label}
                </p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Western Province first */}
      <section aria-labelledby="where-h" className="px-3 md:px-6">
        <div className="grain relative grid overflow-hidden rounded-[2.5rem] bg-night text-white md:min-h-[min(860px,100svh)] md:grid-cols-2">
          <div className="relative min-h-[420px] overflow-hidden md:order-2 md:min-h-0">
            <Parallax amount={6}>
              <Photo photo={STOCK.colomboNight} sizes="(min-width: 768px) 50vw, 100vw" className="size-full object-cover opacity-45" />
            </Parallax>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-night)_0%,transparent_28%,transparent_70%,var(--color-night)_100%)] md:bg-[linear-gradient(90deg,var(--color-night)_0%,transparent_38%),linear-gradient(0deg,rgb(3_21_15/0.7)_0%,transparent_35%)]"
            />
            <div aria-hidden="true" className="absolute inset-0">
              <IslandMap className="absolute inset-0" />
            </div>
            <p aria-hidden="true" className="absolute bottom-6 right-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 md:bottom-10 md:right-10">
              Colombo · 6.93° N, 79.86° E
            </p>
          </div>
          <div className="relative flex flex-col justify-center px-6 pb-16 pt-4 md:px-16 md:py-24 lg:px-24">
            <p className="eyebrow text-mint">Where we work</p>
            <SplitReveal id="where-h" className={`mt-6 ${h2}`}>
              Western Province <em className="text-mint">first.</em>
            </SplitReveal>
            <p className="mt-6 max-w-[44ch] text-lg text-white/75">
              We work across three districts. Property comes first; we also take premium cars, and dealers can book a monthly retainer.
            </p>
            <Reveal as="ul" stagger={0.08} y={24} className="mt-10 border-t border-white/15">
              {['Colombo', 'Gampaha', 'Kalutara'].map((d) => (
                <li key={d} className="flex items-center justify-between border-b border-white/15 py-4">
                  <span className="font-display text-[clamp(28px,2.6vw,38px)] leading-none">{d}</span>
                  <span className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    District <span className="size-1.5 rounded-full bg-(--color-glow)" aria-hidden="true" />
                  </span>
                </li>
              ))}
            </Reveal>
            <div className="mt-10 rounded-[1.5rem] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm">
              <p className="font-semibold text-mint">Selling from abroad?</p>
              <p className="mt-1.5 max-w-[46ch] text-[15px] text-white/75">
                We visit, film and show it for you. You follow every enquiry and offer from your portal, wherever you live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {latest.length > 0 && (
        <section aria-labelledby="pf-h" className="pt-24 md:pt-40">
          <div className={wrap}>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-brand-green">Portfolio</p>
                <SplitReveal id="pf-h" className={`mt-5 ${h2}`}>
                  On the market with <em className="text-brand-green">Vikkaa.</em>
                </SplitReveal>
              </div>
              <Link href="/portfolio" className="btn btn-outline">
                See the full portfolio <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <Reveal stagger={0.1} className="mt-12 grid gap-8 md:grid-cols-3">
              {latest.map((a) => (
                <AssetCard key={a.id} asset={a} />
              ))}
              {latest.length < 3 && (
                <Link
                  href="/sell"
                  className={`group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-mist p-8 transition-colors hover:bg-[#e3eae5] md:p-10 ${
                    latest.length === 1 ? 'md:col-span-2' : ''
                  }`}
                >
                  {latest.length === 1 ? (
                    <div aria-hidden="true" className="absolute inset-y-3 right-3 hidden w-[46%] overflow-hidden rounded-[1.1rem] md:block">
                      <Photo photo={STOCK.tropicalHouse} sizes="30vw" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      {/* Viewfinder corners: the frame waiting for the seller's own property */}
                      <span className="absolute left-5 top-5 size-7 border-l-2 border-t-2 border-white/80" />
                      <span className="absolute right-5 top-5 size-7 border-r-2 border-t-2 border-white/80" />
                      <span className="absolute bottom-5 left-5 size-7 border-b-2 border-l-2 border-white/80" />
                      <span className="absolute bottom-5 right-5 size-7 border-b-2 border-r-2 border-white/80" />
                      <span className="absolute right-[4.5rem] top-[1.6rem] flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white">
                        <LiveDot /> REC
                      </span>
                    </div>
                  ) : (
                    <TickLine className="pointer-events-none absolute -bottom-10 -right-10 w-[min(420px,70%)] text-brand-green/40" />
                  )}
                  <p className="eyebrow relative text-brand-green">Yours next</p>
                  <div className="relative">
                    <p className="max-w-[16ch] font-display text-[clamp(32px,3.2vw,48px)] leading-[1.04]">
                      Your property could be the next one we <em className="text-brand-green">film.</em>
                    </p>
                    <span className="btn btn-primary mt-8 group-hover:bg-brand-green">
                      Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* The founders */}
      <section aria-labelledby="founders-h" className="py-24 md:py-40">
        <div className={`${wrap} grid items-center gap-14 md:grid-cols-2 md:gap-20`}>
          <div className="relative aspect-[6/7]">
            <div className="absolute left-0 top-0 h-[80%] w-[80%] overflow-hidden rounded-[1.5rem] bg-brand">
              <Parallax>
                {/* No stock people here: in a "who you'll work with" section they'd read as the founders. */}
                <Photo photo={STOCK.villaAerialWide} sizes="(min-width: 768px) 40vw, 80vw" />
              </Parallax>
            </div>
            <div className="absolute bottom-0 right-0 h-[48%] w-[50%] overflow-hidden rounded-[1.5rem] bg-night ring-[6px] ring-paper md:ring-8">
              <Parallax amount={12}>
                <Photo photo={STOCK.droneBlack} sizes="(min-width: 768px) 25vw, 50vw" />
              </Parallax>
            </div>
            <p className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/75 px-3.5 py-2 text-[12px] font-semibold text-brand shadow-lg backdrop-blur-md md:bottom-[24%] md:left-6 md:top-auto md:px-4 md:text-[13px]">
              We bring Sony cameras and DJI drones
            </p>
          </div>
          <div>
            <p className="eyebrow text-brand-green">Who you’ll work with</p>
            <SplitReveal id="founders-h" className={`mt-6 max-w-[16ch] ${h2}`}>
              Two people you can call, from first visit to final <em className="text-brand-green">signature.</em>
            </SplitReveal>
            <p className="mt-7 max-w-[50ch] text-lg text-ink-soft">
              We both work in digital marketing and film. Now we put that craft behind the biggest sale most people ever make, and we answer
              the phone ourselves.
            </p>
            <Reveal as="figure" className="mt-12 border-l-2 border-brand-green pl-6 md:pl-8">
              <blockquote className="max-w-[26ch] font-display text-[clamp(26px,2.6vw,38px)] leading-[1.15]">
                “If we wouldn’t put our own names on the campaign, we don’t take the property.”
              </blockquote>
              <figcaption className="eyebrow mt-5 text-ink-soft">The Vikkaa founders</figcaption>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Two doors: sell or buy */}
      <section aria-labelledby="start-h" className="grid gap-3 px-3 pb-3 md:grid-cols-2 md:gap-6 md:px-6 md:pb-6">
        <h2 id="start-h" className="sr-only">
          Sell or buy with Vikkaa
        </h2>
        <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[2.5rem] bg-mist p-8 md:min-h-[560px] md:p-14">
          <p aria-hidden="true" className="text-outline pointer-events-none absolute -bottom-[0.18em] -right-[0.04em] select-none font-display text-[clamp(140px,17vw,250px)] leading-none [--outline:rgb(11_40_30/0.22)]">
            Sell
          </p>
          <div className="relative flex items-start justify-between gap-6">
            <p className="eyebrow text-brand-green">Selling</p>
            <div aria-hidden="true" className="flex -space-x-4">
              {[STOCK.villaAerialWide, STOCK.tropicalHouse, STOCK.carRed].map((p, i) => (
                <div
                  key={p.id}
                  className="size-16 overflow-hidden rounded-2xl ring-4 ring-mist md:size-20"
                  style={{ transform: `rotate(${(i - 1) * 6}deg) translateY(${i === 1 ? -6 : 0}px)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stockUrl(p, 320)} alt="" loading="lazy" className="size-full object-cover" />
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <h3 className="max-w-[14ch] font-display text-[clamp(36px,3.6vw,56px)] leading-[1.02]">Selling a property or a vehicle?</h3>
            <p className="mt-4 max-w-[40ch] text-ink-soft">
              Tell us about it in three minutes. If it’s a fit, we visit, price it and show you the plan before you pay anything.
            </p>
            <Link href="/sell" className="btn btn-primary mt-8">
              Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[2.5rem] bg-brand p-8 text-white md:min-h-[560px] md:p-14">
          <div aria-hidden="true" className="absolute inset-0">
            <Parallax amount={6}>
              <Photo photo={STOCK.lotusTower} sizes="(min-width: 768px) 50vw, 100vw" className="size-full object-cover opacity-35" />
            </Parallax>
            <div className="absolute inset-0 bg-[linear-gradient(200deg,transparent_10%,var(--color-brand)_75%)]" />
          </div>
          <p aria-hidden="true" className="text-outline pointer-events-none absolute -bottom-[0.18em] -right-[0.04em] select-none font-display text-[clamp(140px,17vw,250px)] leading-none [--outline:rgb(255_255_255/0.22)]">
            Buy
          </p>
          <p className="eyebrow relative text-mint">
            Buying
          </p>
          <div className="relative">
            <h3 className="max-w-[14ch] font-display text-[clamp(36px,3.6vw,56px)] leading-[1.02]">
              Looking to <em className="text-mint">buy?</em>
            </h3>
            <p className="mt-4 max-w-[40ch] text-white/80">
              Tell us what you want. Vikkaa Circle members see new listings two days before everyone else.
            </p>
            <Link href="/buy" className="btn btn-light mt-8">
              Join the Vikkaa Circle <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const HERO_LINES = [
  <>Your property,</>,
  <>shown the way it</>,
  <>
    deserves to be <em className="text-mint">seen.</em>
  </>,
];

function Hero() {
  const photo = STOCK.villaAhangama;
  return (
    <section aria-labelledby="hero-h" className="grain relative isolate flex h-svh min-h-[640px] flex-col justify-end overflow-hidden bg-night text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="100vw"
        alt={photo.alt}
        fetchPriority="high"
        className="absolute inset-0 -z-10 size-full object-cover motion-safe:animate-ken-burns"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* Same URL as the srcSet's 1600w candidate, so desktops reuse the cached photo instead of downloading it twice. */}
        <HeroCanvas image={photo.src} />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(3_21_15/0.5)_0%,rgb(3_21_15/0)_24%,rgb(3_21_15/0.12)_50%,rgb(3_21_15/0.92)_100%),linear-gradient(90deg,rgb(3_21_15/0.6)_0%,rgb(3_21_15/0.28)_42%,transparent_72%)]"
      />

      <div className={`${wrap} grid gap-10 pb-10 pt-32 md:grid-cols-[1fr_auto] md:items-end md:pb-14`}>
        <div>
          <p className="eyebrow text-white/80 motion-safe:animate-rise">
            Property and vehicle marketing<span className="hidden sm:inline">, Sri Lanka</span>
          </p>
          <h1 id="hero-h" className="mt-6 font-display text-[clamp(46px,7.6vw,128px)] leading-[0.94] tracking-[-0.01em]">
            {HERO_LINES.map((line, i) => (
              <span key={i} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                <span className="block motion-safe:animate-line" style={{ animationDelay: `${120 + i * 110}ms` }}>
                  {line}{' '}
                </span>
              </span>
            ))}
          </h1>
          <p className="mt-7 max-w-[50ch] text-[17px] text-white/85 motion-safe:animate-rise md:text-lg" style={{ animationDelay: '520ms' }}>
            We price it with real market data, film it ourselves, run it on every platform at once and handle every buyer until it sells.
          </p>
          <div className="mt-9 flex flex-wrap gap-3 motion-safe:animate-rise" style={{ animationDelay: '640ms' }}>
            <Link href="/sell" className="btn btn-light">
              Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/buy" className="btn btn-ghost">
              Find a property
            </Link>
          </div>
        </div>

        <div className="hidden flex-col items-end gap-8 motion-safe:animate-rise md:flex" style={{ animationDelay: '800ms' }}>
          <p className="flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-semibold backdrop-blur-md">
            <LiveDot /> Now booking shoots in the Western Province
          </p>
          <a href="#platforms-h" className="group flex items-center gap-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-white/75 hover:text-white">
            Scroll
            <span aria-hidden="true" className="relative block h-14 w-px rotate-180 overflow-hidden bg-white/25">
              <span className="absolute inset-0 hidden bg-white motion-safe:block motion-safe:animate-[line-up_2.2s_var(--ease-out-expo)_infinite]" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
