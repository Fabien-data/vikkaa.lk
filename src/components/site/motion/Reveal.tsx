'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, whenMotionOk } from './gsap';

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'ul' | 'ol' | 'li' | 'p' | 'figure' | 'article';
  /** Seconds between children. When set, each direct child animates in turn instead of the wrapper. */
  stagger?: number;
  y?: number;
  delay?: number;
};

/**
 * Fades and lifts content in when it scrolls into view. For content below the fold only:
 * above the fold, use CSS (`motion-safe:animate-rise`) so nothing flashes before hydration.
 */
export function Reveal({ children, className, as = 'div', stagger, y = 48, delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const el = ref.current!;
        gsap.from(stagger ? el.children : el, {
          y,
          autoAlpha: 0,
          duration: 1.2,
          ease: 'expo.out',
          delay,
          stagger,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      }),
    [stagger, y, delay],
  );
  const Tag = as as 'div';
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
