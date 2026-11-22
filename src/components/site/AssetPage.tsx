import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, MapPin, MessageCircle, Phone } from 'lucide-react';
import { config } from '@/lib/config';
import { formatLkr } from '@/lib/money';
import { whatsappLink } from '@/lib/whatsapp';
import type { AssetCategory } from '@/lib/enums';
import { assetJsonLd, getPublicAsset, publicPath, type PublicAsset } from '@/server/public-assets';
import { EnquiryForm } from './EnquiryForm';
import { Reveal } from './motion/Reveal';
import { youtubeEmbed } from '@/lib/youtube';

const FACTS: Record<AssetCategory, [string, string, string?][]> = {
  property: [
    ['bedrooms', 'Bedrooms'],
    ['bathrooms', 'Bathrooms'],
    ['landPerches', 'Land', 'perch'],
    ['floorAreaSqft', 'Floor area', 'sq ft'],
  ],
  vehicle: [
    ['year', 'Year'],
    ['mileageKm', 'Mileage', 'km'],
    ['fuel', 'Fuel'],
    ['transmission', 'Transmission'],
  ],
};

const TRUST = [
  ['Visited and checked', 'One of us went there, checked the documents and the details on this page.'],
  ['Filmed by us', 'The photos and film were shot by our own crew, not the seller’s phone.'],
  ['You deal with Vikkaa', 'Every question, viewing and offer goes through us, not the seller.'],
] as const;

export async function assetMetadata(category: AssetCategory, slug: string): Promise<Metadata> {
  const a = await getPublicAsset(category, slug);
  if (!a) return {};
  const description = (a.description ?? `${a.title} in ${a.area}, marketed by Vikkaa.`).slice(0, 160);
  return {
    title: a.title,
    description,
    alternates: { canonical: publicPath(a) },
    openGraph: { title: a.title, description, images: a.photos[0] ? [a.photos[0].src] : undefined, url: publicPath(a) },
  };
}

const sectionTitle = 'font-display text-[clamp(32px,3.4vw,46px)] leading-[1.05] text-brand-ink';

export async function AssetPage({ category, slug }: { category: AssetCategory; slug: string }) {
  const a: PublicAsset | null = await getPublicAsset(category, slug);
  if (!a) notFound();
  const embed = a.youtubeUrl ? youtubeEmbed(a.youtubeUrl) : null;
  const facts = FACTS[category].filter(([k]) => a.details[k] !== undefined && a.details[k] !== '');
  const wa = whatsappLink(config.vikkaaWhatsapp, `Hello Vikkaa, I'm interested in ${a.title} (${config.publicUrl}${publicPath(a)}).`);
  const noun = category === 'vehicle' ? 'vehicle' : 'property';

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(assetJsonLd(a)).replace(/</g, '\\u003c') }} />

      <header className="mx-auto w-[min(1320px,100%-40px)] pt-32 md:pt-40">
        <p className="eyebrow flex items-center gap-2.5 text-ink-soft motion-safe:animate-rise">
          <Link href="/portfolio" className="rounded-sm transition-colors hover:text-brand-green focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-green">
            Portfolio
          </Link>
          <span aria-hidden="true">/</span> {category === 'vehicle' ? 'Vehicle' : 'Property'}
        </p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div>
            <h1
              className="max-w-[18ch] font-display text-[clamp(42px,6vw,88px)] leading-[0.98] tracking-[-0.01em] text-brand-ink motion-safe:animate-rise"
              style={{ animationDelay: '100ms' }}
            >
              {a.title}
            </h1>
            <p className="mt-4 flex items-center gap-2 text-[17px] text-ink-soft motion-safe:animate-rise" style={{ animationDelay: '200ms' }}>
              <MapPin className="size-4 text-brand-green" aria-hidden="true" />
              {a.area}, {a.district} district
            </p>
          </div>
          <div className="motion-safe:animate-rise" style={{ animationDelay: '260ms' }}>
            {a.status !== 'live' && (
              <span className={`mb-3 inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${a.status === 'sold' ? 'bg-brand text-white' : 'bg-mist text-brand'}`}>
                {a.status === 'sold' ? 'Sold' : 'Under offer'}
              </span>
            )}
            <p className="font-display text-[clamp(32px,3.6vw,48px)] leading-none text-brand-green">
              {a.status === 'sold' ? 'Sold' : formatLkr(a.askingPriceCents)}
            </p>
          </div>
        </div>
      </header>

      {a.photos.length > 0 && (
        <div
          role="group"
          aria-label="Photos"
          className="mx-auto mt-10 grid w-[min(1320px,100%-40px)] gap-3 motion-safe:animate-rise md:h-[min(68vh,640px)] md:grid-cols-[2fr_1fr] md:grid-rows-2"
          style={{ animationDelay: '320ms' }}
        >
          {a.photos.slice(0, 3).map((p, i) => (
            <div
              key={`${i}-${p.src}`}
              className={`relative overflow-hidden rounded-[1.5rem] bg-mist ${i === 0 ? 'aspect-[4/3] md:row-span-2 md:aspect-auto' : 'hidden md:block'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                srcSet={p.srcSet}
                sizes={i === 0 ? '(min-width: 900px) 66vw, 100vw' : '33vw'}
                alt={`${a.title}, photo ${i + 1}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`h-full w-full object-cover ${i === 0 ? 'motion-safe:animate-ken-burns' : ''}`}
              />
              {i === 0 && a.photos.length > 3 && (
                <a href="#photos" className="absolute bottom-4 left-4 rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-brand backdrop-blur-md hover:bg-white">
                  See all {a.photos.length} photos
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto grid w-[min(1320px,100%-40px)] gap-14 pb-20 pt-12 md:pt-16 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-20 lg:pb-28">
        <div className="grid content-start gap-16">
          {facts.length > 0 && (
            <Reveal y={32}>
              <dl className="flex flex-wrap gap-px overflow-hidden rounded-[1.5rem] border border-brand/10 bg-brand/10">
                {facts.map(([k, label, unit]) => (
                  <div key={k} className="flex-1 basis-[40%] bg-paper p-5 md:basis-0 md:p-7">
                    <dt className="eyebrow text-ink-soft">{label}</dt>
                    <dd className="mt-4 whitespace-nowrap font-display text-[clamp(36px,3.6vw,52px)] leading-none text-brand-ink">
                      {String(a.details[k])}
                      {unit && <span className="font-sans text-sm font-semibold text-brand-green"> {unit}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}

          {embed && (
            <Reveal as="section">
              <p className="eyebrow text-brand-green">Walkthrough</p>
              <h2 className={`mt-4 ${sectionTitle}`}>The film</h2>
              <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-night">
                <iframe
                  src={embed}
                  title={`${a.title}: walkthrough film`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              </div>
            </Reveal>
          )}

          <Reveal as="section">
            {a.description && (
              <>
                <p className="eyebrow text-brand-green">The details</p>
                <h2 className={`mt-4 ${sectionTitle}`}>About this {noun}</h2>
                <p className="mt-6 max-w-[64ch] whitespace-pre-line text-[18px] leading-relaxed text-ink-soft">{a.description}</p>
              </>
            )}
            <p className={`flex max-w-[64ch] items-start gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/[0.06] p-5 text-[16px] font-medium text-brand-ink ${a.description ? 'mt-8' : ''}`}>
              <span aria-hidden="true" className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-brand-green text-white">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              Every detail here was checked on our visit. Ask us anything — we were there.
            </p>
          </Reveal>

          {a.photos.length > 1 && (
            <section id="photos" aria-labelledby="photos-h" className={`scroll-mt-28 ${a.photos.length <= 3 ? 'md:hidden' : ''}`}>
              <h2 id="photos-h" className={sectionTitle}>
                More photos
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {a.photos.slice(1).map((p, i) => (
                  // Photos 2 and 3 already sit in the gallery above from md up.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${i}-${p.src}`}
                    src={p.src}
                    srcSet={p.srcSet}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
                    alt={`${a.title}, photo ${i + 2}`}
                    loading="lazy"
                    className={`aspect-[4/3] w-full rounded-[1.5rem] bg-mist object-cover ${i < 2 ? 'md:hidden' : ''}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside aria-label="Price and enquiry" className="self-start lg:top-28 lg:[@media(min-height:860px)]:sticky">
          <div className="rounded-[2rem] border border-brand/[0.08] bg-white p-6 shadow-[0_40px_90px_-50px_rgb(11_40_30/0.35)] sm:p-8">
            <p className="eyebrow text-ink-soft">{a.status === 'sold' ? 'This listing' : 'Asking price'}</p>
            <p className="mt-3 font-display text-[clamp(38px,3.4vw,48px)] leading-none text-brand-ink">
              {a.status === 'sold' ? 'Sold' : formatLkr(a.askingPriceCents)}
            </p>
            {a.status === 'under_offer' && <p className="mt-2 text-sm text-ink-soft">Under offer. You can still enquire.</p>}
            {a.status !== 'sold' && (
              <>
                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  <a href={wa} target="_blank" rel="noreferrer" className="btn btn-primary !px-3">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    WhatsApp us
                  </a>
                  <a href={`tel:${config.vikkaaPhone}`} className="btn btn-outline !px-3">
                    <Phone className="size-4" aria-hidden="true" />
                    Call Vikkaa
                  </a>
                </div>
                <p className="mt-7 flex items-center gap-4 text-sm font-semibold text-brand-ink after:h-px after:flex-1 after:bg-brand/10">Or send an enquiry</p>
                <EnquiryForm slug={a.slug} />
              </>
            )}
          </div>
        </aside>
      </div>

      <section aria-labelledby="trust-h" className="px-3 pb-16 md:px-6 md:pb-24">
        <div className="rounded-[2.5rem] bg-mist">
          <div className="mx-auto grid w-[min(1320px,100%-40px)] gap-12 py-14 md:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
            <div className="flex items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/mark.png" alt="" width={193} height={168} loading="lazy" className="h-12 w-auto md:h-14" />
              <h2 id="trust-h" className="font-display text-[clamp(34px,3.6vw,52px)] leading-[1.02] text-brand-ink">
                Marketed by <em className="text-brand-green">Vikkaa</em>
              </h2>
            </div>
            <Reveal as="ul" stagger={0.1} y={28} className="grid gap-8 sm:grid-cols-3">
              {TRUST.map(([h, p]) => (
                <li key={h}>
                  <h3 className="text-[17px] font-semibold text-brand-ink">{h}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{p}</p>
                </li>
              ))}
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
