import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { config } from '@/lib/config';
import { formatLkr } from '@/lib/money';
import { whatsappLink } from '@/lib/whatsapp';
import { getPitch } from '@/server/pitch';
import { PageHero } from '@/components/site/PageHero';
import { TickList } from '@/components/site/TickList';
import { STOCK } from '@/components/site/stock';
import type { Package, ProspectSegment } from '@/db/schema';
import { PitchBeacon } from './beacon';
import { RequestCallForm } from './request-call-form';

export const metadata: Metadata = { title: 'Prepared for you', robots: { index: false, follow: false } };

const COPY: Record<'dealer' | 'developer' | 'other', { title: React.ReactNode[]; sub: string; points: string[] }> = {
  dealer: {
    title: ['Your stock,', <>shown <em>properly</em></>],
    sub: 'Proper photos, a walkaround film and reels for every car, on Facebook, Instagram, TikTok and YouTube at once, with every enquiry answered for you.',
    points: [
      'We film your cars at your yard: photos, a walkaround film and short reels.',
      'One campaign per car across every platform, paid for from your ad budget, never more than you agree.',
      'Every enquiry comes to us first. We answer within the day and pass you only real buyers, with the details logged.',
      'A weekly report of enquiries, test drives and ad spend, and your own portal with every enquiry on your cars.',
    ],
  },
  developer: {
    title: ['Your project,', <>sold with <em>less waiting</em></>],
    sub: 'A project page, our own photo, drone and film shoot, and one campaign across every platform, with every buyer handled and logged.',
    points: [
      'A dedicated project page with every available unit or plot, kept up to date.',
      'Our own shoot: photos, drone footage, a walkthrough film and reels.',
      'Every enquiry qualified by us (budget, timeline, financing) before it reaches you.',
      'A weekly report of enquiries, viewings and ad spend, and your own portal with every enquiry on your project.',
    ],
  },
  other: {
    title: ['Your property,', <>properly <em>marketed</em></>],
    sub: 'We check the price against real market data, film it ourselves, run the campaign and handle every buyer enquiry for the campaign period.',
    points: [
      'A market report with real comparable prices and a recommended asking price.',
      'Our own photo, drone and film shoot in one visit.',
      'Every buyer handled by us, with viewings run and every contact logged.',
      'A weekly report of enquiries and viewings, and your own portal with every enquiry.',
    ],
  },
};

const copyFor = (s: ProspectSegment) => (s === 'dealer' ? COPY.dealer : s === 'developer' ? COPY.developer : COPY.other);

function priceLine(p: Package) {
  if (p.kind === 'retainer') return `${formatLkr(p.priceCents)} a month${p.unitsPerMonth ? `, up to ${p.unitsPerMonth} listings` : ''}`;
  if (p.kind === 'pilot') return `${formatLkr(p.priceCents)}, 30-day campaign, paid upfront`;
  return `${formatLkr(p.priceCents)} upfront`;
}

export default async function PitchPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await params;
  const { preview } = await searchParams;
  const pitch = await getPitch(token);
  if (!pitch) notFound();
  const { prospect: p, offers, founding } = pitch;
  const copy = copyFor(p.segment);
  const wa = whatsappLink(config.vikkaaWhatsapp, `Hi Vikkaa, this is ${p.contactName ?? ''} from ${p.name}. I saw the page you made for us.`.replace('is  from', 'is from'));

  return (
    <main>
      {!preview && <PitchBeacon token={token} />}
      <PageHero light mark eyebrow={`Prepared for ${p.name}`} title={copy.title} sub={copy.sub}>
        <a href="#call" className="btn btn-primary">
          Request a call
        </a>
        <a href={wa} className="btn btn-outline">
          <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp us
        </a>
      </PageHero>

      {(p.diagnosis || p.agreedNextStep) && (
        <section aria-labelledby="saw-h" className="mx-auto grid w-[min(1120px,100%-40px)] gap-6 pt-16 md:grid-cols-2 md:pt-24">
          {p.diagnosis && (
            <div className="rounded-[1.5rem] border border-brand/10 bg-white p-7">
              <p id="saw-h" className="eyebrow text-brand-green">What we saw</p>
              <p className="mt-4 whitespace-pre-line text-lg text-brand-ink">{p.diagnosis}</p>
            </div>
          )}
          {p.agreedNextStep && (
            <div className="rounded-[1.5rem] border border-brand/10 bg-white p-7">
              <p className="eyebrow text-brand-green">What we agreed</p>
              <p className="mt-4 text-lg text-brand-ink">{p.agreedNextStep}</p>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="what-h" className="mx-auto grid w-[min(1120px,100%-40px)] gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow text-brand-green">What we would do</p>
          <h2 id="what-h" className="mt-4 font-display text-[clamp(34px,4vw,52px)] leading-[1.02] text-brand-ink">
            One team, <em className="text-brand-green">start to finish.</em>
          </h2>
          <TickList items={copy.points} className="mt-8 text-brand-ink" />
        </div>
        <div className="overflow-hidden rounded-[1.5rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={STOCK.droneFlying.src} srcSet={STOCK.droneFlying.srcSet} sizes="(min-width: 768px) 50vw, 100vw" alt={STOCK.droneFlying.alt} loading="lazy" className="size-full object-cover" />
        </div>
      </section>

      {(offers.length > 0 || founding) && (
        <section aria-labelledby="price-h" className="bg-mist py-16 md:py-24">
          <div className="mx-auto w-[min(1120px,100%-40px)]">
            <p className="eyebrow text-brand-green">What it costs</p>
            <h2 id="price-h" className="mt-4 font-display text-[clamp(34px,4vw,52px)] leading-[1.02] text-brand-ink">
              Clear prices, <em className="text-brand-green">agreed in writing.</em>
            </h2>
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {offers.map((o) => (
                <li key={o.id} className="rounded-[1.5rem] border border-brand/10 bg-white p-7">
                  <p className="font-semibold text-brand-ink">{o.name}</p>
                  <p className="mt-2 font-display text-3xl text-brand-ink">{priceLine(o)}</p>
                  {o.commissionBp ? (
                    <p className="mt-2 text-sm text-ink-soft">
                      Plus {o.commissionBp / 100}% commission when it sells{o.commissionMinCents > 0 ? ` (minimum ${formatLkr(o.commissionMinCents)})` : ''}.
                    </p>
                  ) : null}
                </li>
              ))}
              {founding && (
                <li className="rounded-[1.5rem] border-2 border-brand-green bg-white p-7">
                  <p className="font-semibold text-brand-green">Founding client terms</p>
                  <p className="mt-2 text-brand-ink">
                    We are taking a few founding clients on special terms in exchange for permission to share the results. Ask us about it.
                  </p>
                </li>
              )}
            </ul>
            <p className="mt-6 text-sm text-ink-soft">
              The fee buys the work in a written scope: filming, the campaign and buyer follow-up. No sale is guaranteed. Your advertising budget is separate, capped at what you agree,
              spent only on your ads and shown in your weekly report.
            </p>
          </div>
        </section>
      )}

      <section id="call" aria-labelledby="call-h" className="mx-auto grid w-[min(1120px,100%-40px)] scroll-mt-24 gap-10 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow text-brand-green">Next step</p>
          <h2 id="call-h" className="mt-4 font-display text-[clamp(34px,4vw,52px)] leading-[1.02] text-brand-ink">
            Ten minutes, <em className="text-brand-green">no pressure.</em>
          </h2>
          <p className="mt-6 max-w-[44ch] text-lg text-ink-soft">Tell us a good time and one of us will call. Or message us on WhatsApp now.</p>
          <a href={wa} className="btn btn-outline mt-8">
            <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp us
          </a>
        </div>
        <div className="rounded-[1.5rem] border border-brand/10 bg-white p-7">
          <RequestCallForm token={token} phone={p.phone} />
        </div>
      </section>
    </main>
  );
}
