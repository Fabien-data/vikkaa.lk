'use client';
import dynamic from 'next/dynamic';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap, whenMotionOk } from '../motion/gsap';
import { useNear, useReducedMotion } from './hooks';

const PhonesScene = dynamic(() => import('./PhonesScene'), { ssr: false });

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube', 'Facebook', 'Property portals'] as const;
const BEATS = [
  ['We film it once, ', 'properly.', 'Photos, drone, a walkthrough film and reels, shot by us in one visit.'],
  ['Then cut it for ', 'every screen.', 'Vertical for TikTok and Reels, wide for YouTube, stills for the portals.'],
  ['And launch it everywhere, ', 'the same day.', 'Facebook, Instagram, TikTok, YouTube and the big portals, with paid reach behind it.'],
] as const;

const Eyebrow = () => (
  <h2 id="every-screen-h" className="eyebrow flex items-center gap-3 text-mint">
    <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />
    One shoot · every screen
  </h2>
);

function Beat({ beat: [lead, em, body] }: { beat: (typeof BEATS)[number] }) {
  return (
    <>
      <h3 className="font-display text-[clamp(34px,4.3vw,62px)] leading-[1.02] tracking-[-0.01em]">
        {lead}
        <em className="text-mint">{em}</em>
      </h3>
      <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-white/75 md:mt-5 md:text-[17px]">{body}</p>
    </>
  );
}

/** Still version for reduced motion or no WebGL: the five screens as a row of phone frames. */
function PhoneRow({ images }: { images: string[] }) {
  return (
    <ul className="mt-14 flex flex-wrap justify-center gap-x-4 gap-y-8 md:mt-20 md:gap-x-6" aria-hidden="true">
      {PLATFORMS.map((name, i) => (
        <li key={name} className="w-[28%] max-w-[190px] md:w-[17%]">
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[1.4rem] border-[5px] border-[#0c1b15] bg-night shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-glow/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[i]} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-signal px-2 py-1 text-[8px] font-extrabold tracking-[0.2em] text-white">
              <span className="size-1 rounded-full bg-white" />
              LIVE
            </span>
          </div>
          <p className="eyebrow mt-3 text-center text-[10px] text-white/70">{name}</p>
        </li>
      ))}
    </ul>
  );
}

/** Self-contained pinned story section: "One shoot, every screen". Server-renders its copy; the canvas inside is client-only. */
export function EveryScreen({ images }: { images: string[] }) {
  const imgs = useMemo(() => PLATFORMS.map((_, i) => images[i % images.length]), [images]);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  const still = reduced || failed;

  const track = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const beats = useRef<(HTMLDivElement | null)[]>([]);
  const progress = useRef(0);
  const near = useNear(track);

  useLayoutEffect(() => {
    if (still) return;
    return whenMotionOk(() => {
      const [b1, b2, b3] = beats.current;
      const out = { opacity: 0, y: -36, filter: 'blur(6px)', duration: 0.08, ease: 'power2.in' };
      const into = { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.1, ease: 'expo.out' };
      const from = { opacity: 0, y: 36, filter: 'blur(6px)' };
      gsap
        .timeline({
          scrollTrigger: {
            trigger: track.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (s) => {
              progress.current = s.progress;
            },
          },
        })
        .to(b1, out, 0.27)
        .fromTo(b2, from, into, 0.34)
        .to(b2, out, 0.6)
        .fromTo(b3, from, into, 0.68)
        .set({}, {}, 1);
    });
  }, [still]);

  if (still)
    return (
      <section aria-labelledby="every-screen-h" className="p-3 md:p-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-glow px-6 py-16 text-white grain md:px-14 md:py-24">
          <Eyebrow />
          <div className="mt-8 grid gap-12 md:grid-cols-3 md:gap-10">
            {BEATS.map((b) => (
              <div key={b[1]} className="[&_h3]:text-[clamp(32px,3.2vw,46px)]">
                <Beat beat={b} />
              </div>
            ))}
          </div>
          <PhoneRow images={imgs} />
        </div>
      </section>
    );

  return (
    <section ref={track} aria-labelledby="every-screen-h" className="relative h-[340vh]">
      <div className="sticky top-0 h-svh p-3 md:p-6">
        <div className="relative h-full overflow-hidden rounded-[2.5rem] bg-glow text-white grain">
          {near && <PhonesScene images={imgs} labels={PLATFORMS} progress={progress} copy={copy} onFail={onFail} />}
          <div ref={copy} className="pointer-events-none relative z-10 max-w-[42rem] px-6 pt-20 md:px-14 md:pt-24">
            <Eyebrow />
            <div className="mt-5 grid md:mt-7">
              {BEATS.map((b, i) => (
                <div
                  key={b[1]}
                  ref={(n) => {
                    beats.current[i] = n;
                  }}
                  className={`[grid-area:1/1] ${i ? 'opacity-0' : ''}`}
                >
                  <Beat beat={b} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
