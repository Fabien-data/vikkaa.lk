'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, SplitText, whenMotionOk } from './gsap';

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  id?: string;
};

/** A heading whose lines slide up out of a mask as it scrolls into view. Below the fold only (see Reveal). */
export function SplitReveal({ children, className, as = 'h2', id }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const split = SplitText.create(ref.current!, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true, // re-splits once the display font loads or the width changes
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.3,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: ref.current, start: 'top 88%', once: true },
            }),
        });
        return () => split.revert();
      }),
    [],
  );
  const Tag = as as 'h2';
  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
