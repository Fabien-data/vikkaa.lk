import Link from 'next/link';
import { formatLkr } from '@/lib/money';
import { publicPath, type PublicAsset } from '@/server/public-assets';

export function AssetCard({ asset }: { asset: PublicAsset }) {
  const cover = asset.photos[0];
  return (
    <Link href={publicPath(asset)} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-mist">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.src} srcSet={cover.srcSet} sizes="(min-width: 900px) 33vw, 100vw" alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        {asset.status !== 'live' && (
          <span className={`absolute left-3.5 top-3.5 px-2.5 py-1 text-[13px] font-semibold ${asset.status === 'sold' ? 'bg-brand-green text-white' : 'bg-white'}`}>
            {asset.status === 'sold' ? 'Sold' : 'Under offer'}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-[23px] group-hover:underline group-hover:decoration-brand-green group-hover:underline-offset-4">
        {asset.title}
      </h3>
      <p className="text-[15px] text-sage">
        {asset.area}, {asset.district}
      </p>
      <p className="mt-1 font-semibold">{asset.status === 'sold' ? 'Sold' : formatLkr(asset.askingPriceCents)}</p>
    </Link>
  );
}
