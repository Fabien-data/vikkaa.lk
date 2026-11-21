import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { config } from '@/lib/config';
import { formatLkr } from '@/lib/money';
import { PageHero } from '@/components/site/PageHero';
import { ScrollProgress } from '@/components/site/ScrollProgress';
import { TickList } from '@/components/site/TickList';
import { Reveal } from '@/components/site/motion/Reveal';
import { SplitReveal } from '@/components/site/motion/SplitReveal';
import { TickLine } from '@/components/site/motion/TickLine';
import { STOCK } from '@/components/site/stock';

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

// True facts about the service only (design/DIRECTION.md, honesty rule).
const FACTS = [
  ['3', ' minutes', 'to tell us about it'],
  ['1', ' working day', 'to hear back from us'],
  ['1', ' visit', 'to shoot photos, drone and film'],
  ['Rs 0', '', 'until you agree to the plan'],
] as const;

export default function HowItWorks() {
  const { propertyCents, vehicleCents } = config.priceGuide;
  return (
    <main>
      <PageHero
        eyebrow="How it works"
        title={['How a sale with', <>Vikkaa <em>works</em></>]}
        sub="From a three-minute form to a signed deed. We price it, film it, run the campaign everywhere at once and handle every buyer until it sells."
        photo={STOCK.droneFlying}
        outline="Process"
      >
        <Link href="/sell" className="btn btn-light">
          Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        <a href="#pricing" className="btn btn-ghost">
          What it costs
        </a>
      </PageHero>

      <section aria-label="At a glance" className="mx-auto w-[min(1320px,100%-40px)] pt-16 md:pt-24">
        <Reveal as="ul" stagger={0.1} y={32} className="grid grid-cols-2 gap-y-10 border-y border-brand/10 py-10 md:grid-cols-4">
          {FACTS.map(([n, unit, label]) => (
            <li key={label} className="px-1 md:border-l md:border-brand/10 md:px-8 md:first:border-l-0 md:first:pl-0">
              <p className="font-display text-[clamp(44px,5vw,72px)] leading-none text-brand-ink">
                {n}
                <span className="font-sans text-[clamp(15px,1.4vw,19px)] font-semibold text-brand-green">{unit}</span>
              </p>
              <p className="mt-3 max-w-[22ch] text-[15px] text-ink-soft">{label}</p>
            </li>
          ))}
        </Reveal>
      </section>

      <section aria-labelledby="steps-h" className="mx-auto grid w-[min(1320px,100%-40px)] gap-14 py-20 md:grid-cols-[0.9fr_1.1fr] md:gap-20 md:py-32">
        <div className="self-start md:sticky md:top-28">
          <p className="eyebrow text-brand-green">The process</p>
          <SplitReveal id="steps-h" className="mt-5 max-w-[12ch] font-display text-[clamp(44px,5.6vw,84px)] leading-[0.98] text-brand-ink">
            Six steps. One team, <em className="text-brand-green">start to finish.</em>
          </SplitReveal>
          <p className="mt-6 max-w-[44ch] text-lg leading-relaxed text-ink-soft">
            The people who price it are the people who film it, run the campaign and negotiate with every buyer.
          </p>
          <Reveal className="relative mt-10 hidden overflow-hidden rounded-[1.5rem] md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STOCK.coastUnawatuna.src}
              srcSet={STOCK.coastUnawatuna.srcSet}
              sizes="40vw"
              alt={STOCK.coastUnawatuna.alt}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover"
            />
            <TickLine className="pointer-events-none absolute -bottom-6 -right-6 w-48 text-white/70" width={2} />
          </Reveal>
        </div>

        <div className="relative">
          <div aria-hidden="true" className="absolute bottom-14 left-7 top-7 w-px -translate-x-1/2 bg-brand/10">
            <ScrollProgress className="h-full w-full bg-brand-green" />
          </div>
          <ol className="relative grid gap-14 md:gap-20">
            {STEPS.map(([h, p], i) => (
              <Reveal as="li" key={h} y={40} className="grid grid-cols-[56px_1fr] gap-6 md:gap-10">
                <span aria-hidden="true" className="grid size-14 place-items-center rounded-full border border-brand/15 bg-paper font-display text-[22px] text-brand-green">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="pt-2">
                  <p className="eyebrow text-ink-soft">
                    Step {i + 1} of {STEPS.length}
                  </p>
                  <h3 className="mt-3 font-display text-[clamp(30px,3.2vw,44px)] leading-[1.05] text-brand-ink">{h}</h3>
                  <p className="mt-3 max-w-[52ch] text-[17px] leading-relaxed text-ink-soft md:text-lg">{p}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <div className="px-3 md:px-6">
        <section id="pricing" aria-labelledby="pricing-h" className="bg-glow grain relative scroll-mt-24 overflow-hidden rounded-[2.5rem] text-white">
          <p
            aria-hidden="true"
            className="text-outline pointer-events-none absolute -top-[0.12em] left-[-0.04em] select-none whitespace-nowrap font-display text-[clamp(120px,22vw,340px)] leading-none [--outline:rgb(255_255_255/0.12)]"
          >
            Pricing
          </p>
          <div className="relative mx-auto grid w-[min(1320px,100%-40px)] gap-14 py-20 md:grid-cols-2 md:gap-20 md:py-32">
            <div className="self-end">
              <p className="eyebrow text-mint">Pricing</p>
              <SplitReveal id="pricing-h" className="mt-5 font-display text-[clamp(48px,6.4vw,96px)] leading-[0.95]">
                What it <em className="text-mint">costs</em>
              </SplitReveal>
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/80">
                You pay an upfront marketing fee and an advertising deposit. When it sells, we charge a commission.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/sell" className="btn btn-light">
                  Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <Link href="/portfolio" className="btn btn-ghost">
                  See the portfolio
                </Link>
              </div>
            </div>

            <div className="grid content-end gap-6">
              {(propertyCents > 0 || vehicleCents > 0) && (
                <Reveal stagger={0.1} y={32} className="grid gap-4 sm:grid-cols-2">
                  {propertyCents > 0 && (
                    <p className="grid gap-4 rounded-[1.5rem] border border-white/15 bg-white/[0.06] p-7 backdrop-blur-sm">
                      <span className="eyebrow text-mint">Property campaigns from</span>
                      <strong className="font-display text-[clamp(36px,3.6vw,52px)] font-normal leading-none">{formatLkr(propertyCents)}</strong>
                    </p>
                  )}
                  {vehicleCents > 0 && (
                    <p className="grid gap-4 rounded-[1.5rem] border border-white/15 bg-white/[0.06] p-7 backdrop-blur-sm">
                      <span className="eyebrow text-mint">Vehicle campaigns from</span>
                      <strong className="font-display text-[clamp(36px,3.6vw,52px)] font-normal leading-none">{formatLkr(vehicleCents)}</strong>
                    </p>
                  )}
                </Reveal>
              )}
              <Reveal y={32} className="rounded-[1.5rem] border border-white/15 p-7">
                <TickList
                  className="text-white/90 [&_li>span:first-child]:bg-mint [&_li>span:first-child]:text-brand"
                  items={[
                    'Nothing is paid until you agree to the plan.',
                    'Your advertising deposit is spent on your ads, and shown live in your portal.',
                    'If it sells within the agreement period, your upfront fee is credited against our commission.',
                  ]}
                />
              </Reveal>
            </div>
          </div>
        </section>
      </div>
      <div className="h-16 md:h-24" />
    </main>
  );
}
