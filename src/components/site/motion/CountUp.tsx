'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, whenMotionOk } from './gsap';

/** Renders the final number on the server; counts up from zero when it scrolls into view. */
export function CountUp({ value, prefix = '', suffix = '', className }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) => `${prefix}${Math.round(n).toLocaleString('en-LK')}${suffix}`;
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const el = ref.current!;
        const state = { n: 0 };
        el.textContent = format(0);
        gsap.to(state, {
          n: value,
          duration: 2.2,
          ease: 'power3.out',
          onUpdate: () => void (el.textContent = format(state.n)),
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, prefix, suffix],
  );
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
