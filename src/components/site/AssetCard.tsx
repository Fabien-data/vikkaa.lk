import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatLkr } from '@/lib/money';
import { publicPath, type PublicAsset } from '@/server/public-assets';

/** A listing as a cinematic card. Designed for paper or mist backgrounds. */
export function AssetCard({ asset }: { asset: PublicAsset }) {
  const cover = asset.photos[0];
  return (
    <Link
      href={publicPath(asset)}
      className="group block rounded-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-brand-green"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-mist">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.src}
            srcSet={cover.srcSet}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1.6s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06] motion-reduce:transition-none"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(3_21_15/0.28)_0%,transparent_32%)]" />
        <span
          className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur-md ${
            asset.status === 'sold' ? 'bg-brand text-white' : 'bg-white/90 text-brand'
          }`}
        >
          {asset.status === 'live' && (
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-signal opacity-60 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-signal" />
            </span>
          )}
          {asset.status === 'sold' ? 'Sold' : asset.status === 'under_offer' ? 'Under offer' : 'For sale'}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-4 right-4 grid size-12 translate-y-2 place-items-center rounded-full bg-white text-brand opacity-0 shadow-lg transition-[opacity,transform] duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>
      <h3 className="mt-5 font-display text-[clamp(24px,2.2vw,30px)] leading-[1.1] text-brand-ink">{asset.title}</h3>
      <p className="mt-1.5 text-[15px] text-ink-soft">
        {asset.area}, {asset.district}
      </p>
      <p className="mt-4 flex items-center justify-between border-t border-brand/10 pt-4 text-[17px] font-semibold text-brand">
        {asset.status === 'sold' ? 'Sold' : formatLkr(asset.askingPriceCents)}
        <span aria-hidden="true" className="eyebrow text-brand-green transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1">View</span>
      </p>
    </Link>
  );
}
