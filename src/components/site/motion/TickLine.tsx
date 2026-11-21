'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, whenMotionOk } from './gsap';
import { TICK_PATH, TICK_VIEWBOX } from '../tick';

/**
 * The brand tick as thin line art that draws itself as you scroll past: the site's signature decoration
 * (Prime Lands' line vectors, made ours). Decorative only; position it with className.
 */
export function TickLine({ className, stroke = 'currentColor', width = 1.2 }: { className?: string; stroke?: string; width?: number }) {
  const ref = useRef<SVGPathElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        gsap.fromTo(
          ref.current,
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 95%', end: 'bottom 35%', scrub: 1 } },
        );
      }),
    [],
  );
  return (
    <svg viewBox={TICK_VIEWBOX} className={className} aria-hidden="true" fill="none">
      <path ref={ref} d={TICK_PATH} stroke={stroke} strokeWidth={width} pathLength={1} strokeDasharray={1} />
    </svg>
  );
}
