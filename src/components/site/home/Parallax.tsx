'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, whenMotionOk } from '../motion/gsap';

/** Drifts its children (an image) inside an overflow-hidden, positioned frame as the frame scrolls past. */
export function Parallax({ children, amount = 8 }: { children: React.ReactNode; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const el = ref.current!;
        gsap.fromTo(
          el,
          { yPercent: -amount },
          { yPercent: amount, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
      }),
    [amount],
  );
  return (
    <div ref={ref} className="absolute inset-x-0 -inset-y-[12%]">
      {children}
    </div>
  );
}
