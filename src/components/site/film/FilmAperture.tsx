'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { gsap, ScrollTrigger, whenMotionOk } from '../motion/gsap';
import { ScrubWords } from '../home/ScrubWords';
import { TICK_PATH, TICK_VIEWBOX } from '../tick';
import { useNear, useReducedMotion } from '../three/hooks';
import { CHAPTERS, FILM } from './chapters';
import { useFilmCut, usePlayWhileVisible } from './hooks';

const TRACK_ID = 'vikkaa-film-track';
const CLIP_ID = 'vikkaa-film-tick';
const LIST_ID = 'vikkaa-film-chapters';

// The window opens from this point in the tick's thick base (TICK_VIEWBOX units). The tick is solid for 46 units around it,
// so once 44 units cover half the stage's diagonal, the window covers the whole stage.
const FOCUS = [128, 292] as const;
const SOLID = 44;
const [TICK_W, TICK_H] = TICK_VIEWBOX.split(' ').slice(2).map(Number);

// Pinned scroll, 0..1: manifesto, then the window opens, full bleed, and the film settles into a card.
const OPEN_FROM = 0.16;
const OPEN_TO = 0.56;
const COPY_GONE = 0.34;
const UI_FROM = 0.52;
const CARD_FROM = 0.8;

const clamp = gsap.utils.clamp(0, 1);
const span = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
const openEase = gsap.parseEase('power2.inOut');
const cardEase = gsap.parseEase('expo.out');

// Equaliser bars of the Sound toggle. A hoisted <style>: this project's turbopack CSS rule compiles *.module.css as global CSS.
const EQ_CSS = `@keyframes vf-eq{to{scale:1 1}}@media (prefers-reduced-motion:no-preference){.vf-eq>span{animation:vf-eq .9s ease-in-out infinite alternate}.vf-eq>span:nth-child(2){animation-duration:.7s;animation-delay:-.45s}.vf-eq>span:nth-child(3){animation-duration:1.1s;animation-delay:-.2s}.vf-eq>span:nth-child(4){animation-duration:.8s;animation-delay:-.6s}}`;

/**
 * "Why Vikkaa" as a pinned story: the manifesto fills word by word beside the brand tick, which is a window onto the film;
 * the window then opens around a point in its base until the film fills the stage, plays without player chrome (the film
 * carries its own titles), and settles into a rounded card. Reduced motion: manifesto, then a poster card with a Play button.
 */
export function FilmAperture({ eyebrow, children }: { eyebrow: React.ReactNode; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const ui = useRef<HTMLDivElement>(null);
  const clip = useRef<SVGPathElement>(null);
  const stroke = useRef<SVGPathElement>(null);

  const near = useNear(track);
  const reduced = useReducedMotion();
  const cut = useFilmCut();
  const file = reduced ? FILM.landscape : cut; // the reduced-motion card is always 16:9
  const [sound, setSound] = useState(false);
  const [started, setStarted] = useState(false); // reduced motion: the visitor pressed Play
  usePlayWhileVisible(video, near && !reduced, file.src);

  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const [st, sl, cp, fm, vd, vg, u, cl, sk] = [stage, slot, copy, film, video, vignette, ui, clip, stroke].map((r) => r.current!) as [
          HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLVideoElement, HTMLDivElement, HTMLDivElement, SVGPathElement, SVGPathElement,
        ];
        let geo = { w: 1, h: 1, x: 0, y: 0, s0: 1, s1: 1 };
        // Cover the stage while the crop stays inside the film's title-safe margins; otherwise letterbox on night.
        // The landscape cut keeps its titles ~8% in from each side, the vertical cut ~13%.
        const fit = () => {
          const va = vd.videoWidth ? vd.videoWidth / vd.videoHeight : 16 / 9;
          const sa = geo.w / geo.h;
          vd.style.objectFit = Math.min(sa / va, va / sa) < (va > 1 ? 0.86 : 0.76) ? 'contain' : 'cover';
        };
        const measure = () => {
          const a = st.getBoundingClientRect();
          const b = sl.getBoundingClientRect();
          const s0 = b.width / TICK_W;
          geo = { w: a.width, h: a.height, x: b.left - a.left, y: b.top - a.top, s0, s1: Math.max(s0, Math.hypot(a.width, a.height) / 2 / SOLID) };
          fit();
        };
        vd.addEventListener('loadedmetadata', fit);

        let open = false;
        const render = (p: number) => {
          const { w, h, x, y, s0, s1 } = geo;
          const a = openEase(span(p, OPEN_FROM, OPEN_TO));
          // Geometric scale reads as an even zoom; the focus point drifts to the stage centre as it grows.
          const k = s0 * (s1 / s0) ** a;
          const tx = gsap.utils.interpolate(x + FOCUS[0] * s0, w / 2, a) - FOCUS[0] * k;
          const ty = gsap.utils.interpolate(y + FOCUS[1] * s0, h / 2, a) - FOCUS[1] * k;
          cl.setAttribute('transform', `matrix(${k / w} 0 0 ${k / h} ${tx / w} ${ty / h})`);
          sk.setAttribute('transform', `matrix(${k} 0 0 ${k} ${tx} ${ty})`);
          sk.style.strokeWidth = `${1.25 / k}`;
          sk.style.opacity = `${1 - clamp(a * 5)}`;

          // The film covers the part of the window that is on stage, so the frame stays composed inside the tick.
          const l = Math.max(0, tx);
          const t = Math.max(0, ty);
          const r = Math.min(w, tx + TICK_W * k);
          const b = Math.min(h, ty + TICK_H * k);
          const cover = Math.max((r - l) / w, (b - t) / h);
          vd.style.transform = `translate(${(l + r - cover * w) / 2}px, ${(t + b - cover * h) / 2}px) scale(${cover})`;

          const c = span(p, OPEN_FROM, COPY_GONE);
          cp.style.opacity = `${1 - c}`;
          cp.style.filter = c ? `blur(${c * 10}px)` : '';
          cp.style.transform = `scale(${1 - c * 0.05})`;
          vg.style.opacity = `${a}`;
          const o = span(p, UI_FROM, UI_FROM + 0.08);
          u.style.opacity = `${o}`;
          u.style.visibility = o ? 'visible' : 'hidden';

          const q = cardEase(span(p, CARD_FROM, 1));
          const clipPath = a < 1 ? `url(#${CLIP_ID})` : `inset(${q * (w < 768 ? 12 : 24)}px round ${q * 40}px)`;
          fm.style.setProperty('clip-path', clipPath);
          fm.style.setProperty('-webkit-clip-path', clipPath);

          if ((a === 1) !== open) {
            open = !open;
            // Fully open: start from the hook, unless the film is already near the start (scrolling back and forth).
            if (open && vd.currentTime > CHAPTERS[1].start) vd.currentTime = 0;
            // Closing back into the tick beside the manifesto: no music.
            if (!open && !vd.muted) {
              vd.muted = true;
              setSound(false);
            }
          }
        };

        measure();
        const trigger = ScrollTrigger.create({
          trigger: track.current,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => render(self.progress),
          onRefresh: (self) => {
            measure();
            render(self.progress);
          },
        });
        render(trigger.progress);
        // Webfonts and breakpoints move the tick's slot.
        const ro = new ResizeObserver(() => {
          measure();
          render(trigger.progress);
        });
        ro.observe(st);
        ro.observe(sl);

        // On the way in: the tick draws itself and the film blooms inside it.
        gsap
          .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: track.current, start: 'top 85%', end: 'top 15%', scrub: true } })
          .fromTo(sk, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 } }) // attr: GSAP rounds CSS px, which would snap a 0-1 offset
          .fromTo(fm, { opacity: 0 }, { opacity: 1 }, 0.35);

        return () => {
          ro.disconnect();
          vd.removeEventListener('loadedmetadata', fit);
          gsap.set([cp, fm, vd, vg, u, sk], { clearProps: 'all' });
          cl.removeAttribute('transform');
          sk.removeAttribute('transform');
        };
      }),
    [],
  );

  const toggleSound = () => {
    const v = video.current!;
    v.muted = !v.muted;
    setSound(!v.muted);
    if (!v.muted) v.play().catch(() => {});
  };

  const playFilm = () => {
    const v = video.current!;
    v.muted = false;
    v.play().catch(() => {});
    setStarted(true);
  };

  return (
    <>
      <style href="vikkaa-film-eq" precedence="medium">
        {EQ_CSS}
      </style>
      <div id={TRACK_ID} ref={track} className="relative motion-safe:h-[230vh] motion-safe:md:h-[260vh]">
        <div ref={stage} className="motion-safe:sticky motion-safe:top-0 motion-safe:h-svh motion-safe:overflow-hidden">
          <div ref={copy} className="relative h-full">
            <p
              aria-hidden="true"
              className="text-outline pointer-events-none absolute -left-[3vw] top-6 select-none font-display text-[clamp(150px,30vw,480px)] leading-none [--outline:rgb(11_40_30/0.2)] md:top-12"
            >
              Craft
            </p>
            <div className="relative mx-auto grid w-[min(1320px,100%-40px)] gap-8 pt-28 md:pt-44 motion-safe:h-full motion-safe:content-center motion-safe:pb-6 motion-safe:pt-20 motion-safe:md:grid-cols-[1.12fr_0.88fr] motion-safe:md:items-center motion-safe:md:gap-16 motion-safe:md:pt-16">
              <div>
                {eyebrow}
                <ScrubWords
                  trigger={`#${TRACK_ID}`}
                  start="top 40%"
                  end="top -15%"
                  className="mt-8 max-w-[24ch] font-display text-[clamp(34px,4.4vw,72px)] leading-[1.04] text-brand-ink md:mt-10"
                >
                  {children}
                </ScrubWords>
              </div>
              <div
                ref={slot}
                aria-hidden="true"
                className="aspect-[400/345] w-[min(100%,calc(36svh*1.16))] justify-self-center motion-reduce:hidden md:w-[min(100%,calc(62svh*1.16))] md:justify-self-end"
              />
            </div>
          </div>

          <div
            ref={film}
            className="grain overflow-hidden bg-night motion-safe:absolute motion-safe:inset-0 motion-safe:opacity-0 motion-reduce:relative motion-reduce:mx-auto motion-reduce:mt-16 motion-reduce:aspect-video motion-reduce:w-[min(1320px,100%-40px)] motion-reduce:rounded-[2.5rem]"
          >
            <video
              ref={video}
              aria-label="Vikkaa brand film: how we sell a property"
              aria-describedby={LIST_ID}
              src={near ? file.src : undefined}
              poster={file.poster}
              preload="none"
              muted
              loop
              playsInline
              controls={started}
              disablePictureInPicture
              disableRemotePlayback
              className="absolute inset-0 size-full origin-top-left object-cover"
            />
            <div
              ref={vignette}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_45%,transparent_55%,rgb(3_21_15/0.5)_100%)] opacity-0 motion-reduce:hidden"
            />
            <div
              ref={ui}
              className="invisible absolute inset-x-0 bottom-0 flex justify-end p-5 text-white opacity-0 motion-reduce:hidden md:p-10"
            >
              {/* The film carries its own titles and step rail, so the page adds only the sound control (no second set of captions). */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  aria-pressed={sound}
                  onClick={toggleSound}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-night/40 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-night/60 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-glow aria-pressed:border-mint/60"
                >
                  <span aria-hidden="true" className={`inline-flex h-3 items-end gap-0.5 ${sound ? 'vf-eq' : ''}`}>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-full w-0.5 origin-bottom rounded-full bg-current transition-[scale] duration-500 ${sound ? 'scale-y-80' : 'scale-y-30'}`} />
                    ))}
                  </span>
                  Sound
                </button>
              </div>
            </div>
            {!started && (
              <button type="button" onClick={playFilm} className="btn btn-light absolute bottom-5 left-5 motion-safe:hidden md:bottom-10 md:left-10">
                <Play className="size-4 fill-current" aria-hidden="true" /> Play film
              </button>
            )}
          </div>

          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible motion-reduce:hidden">
            <clipPath id={CLIP_ID} clipPathUnits="objectBoundingBox">
              <path ref={clip} d={TICK_PATH} />
            </clipPath>
            <path ref={stroke} d={TICK_PATH} fill="none" className="stroke-brand-green/60" pathLength={1} strokeDasharray={1} />
          </svg>
        </div>
      </div>
      <ol id={LIST_ID} className="sr-only">
        {CHAPTERS.map((c) => (
          <li key={c.start}>{c.step ? `Step ${c.step}: ${c.title}` : c.title}</li>
        ))}
      </ol>
    </>
  );
}
