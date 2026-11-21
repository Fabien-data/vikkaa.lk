import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { config } from '@/lib/config';
import { formatLkr } from '@/lib/money';
import { whatsappLink } from '@/lib/whatsapp';
import type { AssetCategory } from '@/lib/enums';
import { assetJsonLd, getPublicAsset, publicPath, type PublicAsset } from '@/server/public-assets';
import { EnquiryForm } from './EnquiryForm';

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

function youtubeEmbed(url: string): string | null {
  const id = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

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

export async function AssetPage({ category, slug }: { category: AssetCategory; slug: string }) {
  const a: PublicAsset | null = await getPublicAsset(category, slug);
  if (!a) notFound();
  const embed = a.youtubeUrl ? youtubeEmbed(a.youtubeUrl) : null;
  const facts = FACTS[category].filter(([k]) => a.details[k] !== undefined && a.details[k] !== '');
  const wa = whatsappLink(config.vikkaaWhatsapp, `Hello Vikkaa, I'm interested in ${a.title} (${config.publicUrl}${publicPath(a)}).`);

  return (
    <main className="mx-auto w-[min(1160px,100%-40px)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(assetJsonLd(a)).replace(/</g, '\\u003c') }} />
      <div className="pb-7 pt-11">
        <p className="text-[15px] text-sage">
          <Link href="/portfolio">Portfolio</Link> / {category === 'vehicle' ? 'Vehicle' : 'Property'}
        </p>
        <h1 className="mt-2.5 max-w-[20ch] font-display text-[clamp(36px,5vw,60px)] leading-[1.05] text-brand">{a.title}</h1>
        <p className="mt-2 text-sage">
          {a.area}, {a.district} district
        </p>
      </div>

      {a.photos.length > 0 && (
        <div className="grid gap-2.5 md:h-[min(62vh,560px)] md:grid-cols-[2fr_1fr] md:grid-rows-2" aria-label="Photos">
          {a.photos.slice(0, 3).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${i}-${p.src}`}
              src={p.src}
              srcSet={p.srcSet}
              sizes={i === 0 ? '(min-width: 900px) 66vw, 100vw' : '33vw'}
              alt={`${a.title}, photo ${i + 1}`}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`h-full w-full bg-mist object-cover ${i === 0 ? 'aspect-[4/3] md:row-span-2 md:aspect-auto' : 'hidden md:block'}`}
            />
          ))}
        </div>
      )}

      <div className="grid gap-16 pb-24 pt-14 md:grid-cols-[1.6fr_1fr]">
        <div>
          {facts.length > 0 && (
            <dl className="grid grid-cols-2 border-y border-[#d9e1db] md:grid-cols-4">
              {facts.map(([k, label, unit]) => (
                <div key={k} className="py-4 pr-3">
                  <dt className="text-sm text-sage">{label}</dt>
                  <dd className="font-display text-[26px]">
                    {String(a.details[k])}
                    {unit ? ` ${unit}` : ''}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {embed && (
            <>
              <h2 className="mt-11 font-display text-3xl text-brand">The film</h2>
              <iframe
                src={embed}
                title={`${a.title}: walkthrough film`}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="mt-4 aspect-video w-full"
              />
            </>
          )}
          {a.description && (
            <>
              <h2 className="mt-11 font-display text-3xl text-brand">About this {category === 'vehicle' ? 'vehicle' : 'property'}</h2>
              <p className="mt-3.5 max-w-[64ch] whitespace-pre-line">{a.description}</p>
            </>
          )}
          <p className="mt-3.5 max-w-[64ch]">Every detail here was checked on our visit. Ask us anything — we were there.</p>
        </div>

        <aside aria-label="Price and enquiry" className="self-start border border-t-[3px] border-[#d9e1db] border-t-brand-green bg-white p-7 md:sticky md:top-6">
          <p className="font-display text-[38px] leading-tight text-brand">{a.status === 'sold' ? 'Sold' : formatLkr(a.askingPriceCents)}</p>
          {a.status === 'under_offer' && <p className="text-sm text-sage">Under offer. You can still enquire.</p>}
          {a.status !== 'sold' && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <a href={wa} target="_blank" rel="noreferrer" className="rounded-sm bg-[#1f7a4d] px-3 py-3 text-center font-semibold text-white">
                  WhatsApp us
                </a>
                <a href={`tel:${config.vikkaaPhone}`} className="rounded-sm border border-brand px-3 py-3 text-center font-semibold text-brand">
                  Call Vikkaa
                </a>
              </div>
              <EnquiryForm slug={a.slug} />
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
