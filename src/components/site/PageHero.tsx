import type { StockPhoto } from './stock';
import { DrawnTick } from './DrawnTick';

type Props = {
  eyebrow: string;
  /** One entry per headline line; each line rises out of its own mask. Put one word in <em>. */
  title: React.ReactNode[];
  sub?: React.ReactNode;
  /** Full-bleed photo behind the dark band, slowly zooming out. */
  photo?: StockPhoto;
  /** Giant outlined word behind the heading. */
  outline?: string;
  /** Draws the brand tick beside the heading. */
  mark?: boolean;
  /** Paper background instead of the dark inset band. */
  light?: boolean;
  /** Buttons or notes under the sub copy. */
  children?: React.ReactNode;
};

/**
 * The inner-page opening shot. Above the fold, so CSS animation only. Leaves room for the fixed header,
 * which floats over the top of the dark band.
 */
export function PageHero({ eyebrow, title, sub, photo, outline, mark, light, children }: Props) {
  const body = (
    <div className="relative mx-auto grid w-[min(1320px,100%-40px)] items-end gap-10 md:grid-cols-[1fr_auto]">
      <div>
        <p className={`eyebrow motion-safe:animate-rise ${light ? 'text-brand-green' : 'text-mint'}`}>{eyebrow}</p>
        <h1
          className={`mt-6 max-w-[16ch] font-display text-[clamp(46px,7.4vw,108px)] leading-[0.98] tracking-[-0.01em] ${
            light ? 'text-brand-ink [&_em]:text-brand-green' : '[&_em]:text-mint'
          }`}
        >
          {title.map((line, i) => (
            <span key={i} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="block motion-safe:animate-line" style={{ animationDelay: `${120 + i * 110}ms` }}>
                {line}
              </span>
            </span>
          ))}
        </h1>
        {sub && (
          <p
            className={`mt-7 max-w-[54ch] text-[18px] leading-relaxed motion-safe:animate-rise md:text-[19px] ${light ? 'text-ink-soft' : 'text-white/85'}`}
            style={{ animationDelay: `${260 + title.length * 110}ms` }}
          >
            {sub}
          </p>
        )}
        {children && (
          <div className="mt-9 flex flex-wrap items-center gap-3 motion-safe:animate-rise" style={{ animationDelay: `${380 + title.length * 110}ms` }}>
            {children}
          </div>
        )}
      </div>
      {mark && (
        <DrawnTick
          delay={500}
          width={light ? 2 : 1.4}
          className={`order-first w-28 md:order-none md:w-[min(380px,30vw)] md:pb-4 ${light ? 'text-brand-green' : 'text-glow'}`}
        />
      )}
    </div>
  );

  const word = outline && (
    <p
      aria-hidden="true"
      className={`text-outline pointer-events-none absolute -bottom-[0.18em] right-[-0.04em] select-none whitespace-nowrap font-display text-[clamp(120px,24vw,380px)] leading-none ${
        light ? '' : '[--outline:rgb(255_255_255/0.16)]'
      }`}
    >
      {outline}
    </p>
  );

  if (light) {
    return (
      <section className="relative overflow-hidden pb-14 pt-36 md:pb-20 md:pt-48">
        {word}
        {body}
      </section>
    );
  }

  return (
    <div className="px-3 pt-3 md:px-6">
      <section className="bg-glow grain relative isolate flex min-h-[min(82svh,600px)] items-end overflow-hidden rounded-[2.5rem] pb-12 pt-36 text-white md:min-h-[min(74svh,640px)] md:pb-20">
        {photo && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="100vw"
              alt=""
              fetchPriority="high"
              className="absolute inset-0 -z-10 h-full w-full object-cover motion-safe:animate-ken-burns"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(3_21_15/0.9)_0%,rgb(3_21_15/0.55)_55%,rgb(3_21_15/0.2)_100%),linear-gradient(0deg,rgb(3_21_15/0.75)_0%,transparent_55%)]"
            />
          </>
        )}
        {word}
        {body}
      </section>
    </div>
  );
}
