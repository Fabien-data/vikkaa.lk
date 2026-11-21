'use client';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { gsap } from '../motion/gsap';
import { STOCK, type StockPhoto } from '../stock';

// Each card is cut to the frame that format is delivered in.
const SHOTS: { title: string; line: string; ratio: string; photo: StockPhoto }[] = [
  { title: 'Photography', line: 'Every room and every view in its best light.', ratio: '3/2', photo: STOCK.livingRoom },
  { title: 'Drone', line: 'The plot, the roofline and the neighbourhood, from the air.', ratio: '4/5', photo: STOCK.villaAerial },
  { title: 'Walkthrough film', line: 'A cinematic tour a buyer can take from anywhere, even abroad.', ratio: '16/9', photo: STOCK.openAirLiving },
  { title: 'Reels', line: 'Vertical cuts for TikTok, Instagram and Shorts.', ratio: '9/16', photo: STOCK.coastMirissa },
  { title: 'Vehicles', line: 'Premium cars and dealer stock, lit like a launch.', ratio: '3/2', photo: STOCK.carBlack },
];

const card = 'relative w-[80vw] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-[1.5rem] md:h-[min(56svh,540px)] md:w-auto md:max-w-none';

/** "What we shoot": a pinned horizontal gallery on desktop; a native swipe row on mobile and with reduced motion. */
export function ShootGallery() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const el = section.current!;
      const list = track.current!;
      el.dataset.pinned = '';
      const distance = () => list.scrollWidth - document.documentElement.clientWidth;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, pin: true, scrub: 1, end: () => `+=${distance()}`, invalidateOnRefresh: true },
      });
      tl.to(list, { x: () => -distance() }).fromTo(bar.current, { scaleX: 0 }, { scaleX: 1 }, 0);
      list.querySelectorAll('img').forEach((img) =>
        gsap.fromTo(
          img,
          { xPercent: -6 },
          { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tl, start: 'left right', end: 'right left', scrub: true } },
        ),
      );
      // Keyboard focus can't scroll a transformed track into view, so scroll the page to the point where the focused card shows.
      const onFocus = (e: FocusEvent) => {
        const card = (e.target as HTMLElement).closest('li');
        if (!card) return;
        const st = tl.scrollTrigger!;
        const p = (card.offsetLeft + card.offsetWidth + parseFloat(getComputedStyle(list).paddingRight) - document.documentElement.clientWidth) / distance();
        scrollTo(0, st.start + gsap.utils.clamp(0, 1, p) * (st.end - st.start));
      };
      list.addEventListener('focusin', onFocus);
      return () => {
        list.removeEventListener('focusin', onFocus);
        delete el.dataset.pinned;
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={section}
      aria-labelledby="shoot-h"
      className="group/g relative flex flex-col justify-center overflow-clip py-24 md:py-32 data-[pinned]:h-svh md:data-[pinned]:py-0 md:data-[pinned]:pt-16"
    >
      <div className="mx-auto flex w-[min(1320px,100%-40px)] flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <p className="eyebrow text-brand-green">What we shoot</p>
          <h2 id="shoot-h" className="mt-5 font-display text-[clamp(44px,6vw,96px)] leading-[0.95]">
            Shot for every <em className="text-brand-green">format.</em>
          </h2>
        </div>
        <p className="max-w-[38ch] text-[17px] text-ink-soft">
          Each piece is framed for where it will run: 16:9 for YouTube and the portals, 9:16 for reels, 4:5 for the feed.
        </p>
      </div>

      <ul
        ref={track}
        tabIndex={0}
        aria-label="What we shoot"
        className="mt-10 flex w-full snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-brand-green md:mt-14 md:gap-6 md:px-[max(20px,calc((100%_-_1320px)/2))] group-data-[pinned]/g:w-max group-data-[pinned]/g:snap-none group-data-[pinned]/g:overflow-visible group-data-[pinned]/g:pb-0"
      >
        {SHOTS.map((s, i) => (
          <li key={s.title} className={`${card} aspect-[4/5] bg-brand md:aspect-(--ar)`} style={{ '--ar': s.ratio } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.photo.src}
              srcSet={s.photo.srcSet}
              sizes="(min-width: 768px) 60vw, 80vw"
              alt={s.photo.alt}
              loading="lazy"
              className="absolute inset-y-0 -left-[8%] h-full w-[116%] max-w-none object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(3_21_15/0.25)_0%,transparent_30%,transparent_50%,rgb(3_21_15/0.85)_100%)]" />
            <span aria-hidden="true" className="absolute right-5 top-5 hidden rounded-full border border-white/40 px-2.5 py-1.5 text-[11px] font-semibold leading-none tracking-[0.16em] text-white/90 backdrop-blur-md md:block">
              {s.ratio.replace('/', ':')}
            </span>
            <div className="absolute inset-x-6 bottom-6 text-white">
              <span className="eyebrow text-mint">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 font-display text-[clamp(32px,2.8vw,44px)] leading-none">{s.title}</h3>
              <p className="mt-2.5 max-w-[30ch] text-[15px] leading-snug text-white/80">{s.line}</p>
            </div>
          </li>
        ))}
        <li className={`${card} grid aspect-[4/5] content-between bg-brand p-7 text-white md:aspect-[4/5] md:p-10`}>
          <p className="eyebrow text-mint">Yours next</p>
          <div>
            <p className="font-display text-[clamp(32px,3vw,48px)] leading-[1.02]">
              Want your place seen like <em className="text-mint">this?</em>
            </p>
            <Link href="/sell" className="btn btn-light mt-8">
              Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </li>
      </ul>

      <div aria-hidden="true" className="mx-auto mt-10 hidden h-px w-[min(1320px,100%-40px)] bg-brand/15 group-data-[pinned]/g:block">
        <div ref={bar} className="h-full origin-left bg-brand-green" />
      </div>
    </section>
  );
}
