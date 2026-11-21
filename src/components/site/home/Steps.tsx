'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, whenMotionOk } from '../motion/gsap';
import { TICK_PATH, TICK_VIEWBOX } from '../tick';

const STEPS = [
  ['Tell us about it', 'A three-minute form. We call you back within one working day.'],
  ['We visit and price it', 'A market report with real comparable prices, and a plan you approve before you pay anything.'],
  ['We film it', 'Photos, drone, a walkthrough film and reels, all in one visit.'],
  ['It goes live everywhere', 'Facebook, Instagram, TikTok, YouTube, the property portals and Google, on the same day.'],
  ['We handle buyers', 'Viewings, offers and negotiation, until the deed is signed.'],
] as const;

/** The five steps, lighting up in turn as a progress line runs down to the brand tick. All lit without motion. */
export function Steps() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const root = ref.current!;
        const scrub = { trigger: root.querySelector('ol'), start: 'top 62%', end: 'bottom 62%', scrub: true };
        gsap.fromTo(root.querySelector('[data-fill]'), { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: scrub });
        gsap.fromTo(root.querySelector('[data-tick]'), { scale: 0.4, autoAlpha: 0.2 }, { scale: 1, autoAlpha: 1, ease: 'back.out(2)', scrollTrigger: { ...scrub, start: 'bottom 66%' } });
        root.querySelectorAll('li').forEach((li) =>
          gsap.fromTo(li, { opacity: 0.25 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: li, start: 'top 82%', end: 'top 58%', scrub: true } }),
        );
      }),
    [],
  );
  return (
    <div ref={ref} className="relative pl-12 md:pl-20">
      <div aria-hidden="true" className="absolute bottom-8 left-[11px] top-3 w-px bg-white/15 md:bottom-9 md:left-[15px]">
        <div data-fill className="size-full origin-top bg-(--color-glow)" />
      </div>
      <svg data-tick viewBox={TICK_VIEWBOX} aria-hidden="true" className="absolute bottom-0 left-0 w-6 text-glow md:w-8">
        <path d={TICK_PATH} fill="currentColor" />
      </svg>
      <ol className="grid gap-14 pb-16 md:gap-20 md:pb-24">
        {STEPS.map(([title, line], i) => (
          <li key={title} className="relative">
            <span aria-hidden="true" className="absolute -left-12 top-3 grid size-6 place-items-center md:-left-20 md:size-8">
              <span className="size-2 rounded-full bg-mint ring-4 ring-brand md:size-2.5" />
            </span>
            <span className="text-outline block font-display text-[clamp(56px,6vw,96px)] leading-[0.8] [--outline:rgb(181_232_205/0.55)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-5 font-display text-[clamp(30px,3vw,44px)] leading-[1.05]">{title}</h3>
            <p className="mt-3 max-w-[42ch] text-[17px] text-white/75">{line}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
