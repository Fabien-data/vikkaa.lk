'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, whenMotionOk } from './motion/gsap';

/** A rail that fills top to bottom as its parent scrolls past the middle of the screen. Full and still with reduced motion. */
export function ScrollProgress({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        gsap.fromTo(
          ref.current,
          { scaleY: 0 },
          { scaleY: 1, ease: 'none', scrollTrigger: { trigger: ref.current!.parentElement, start: 'top 60%', end: 'bottom 60%', scrub: 0.6 } },
        );
      }),
    [],
  );
  return <div ref={ref} aria-hidden="true" className={`origin-top ${className ?? ''}`} />;
}
