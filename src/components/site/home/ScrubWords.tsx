'use client';
import { useLayoutEffect, useRef } from 'react';
import { gsap, SplitText, whenMotionOk } from '../motion/gsap';

/** A statement whose words fill in one by one as it scrolls through the viewport. Fully inked without motion. */
export function ScrubWords({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(
    () =>
      whenMotionOk(() => {
        const el = ref.current!;
        const split = SplitText.create(el, {
          type: 'words',
          // 'none': no aria-label on the <p> (prohibited there); the word wrappers stay readable as plain text.
          aria: 'none',
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              // The italic accent word stays fully inked: it is the point of the sentence, and lighter green would fail contrast when dimmed.
              self.words.filter((w) => !w.closest('em')),
              // 0.55 keeps unfilled words at ≥3:1 against paper (large text), so the copy stays legible before it fills.
              { opacity: 0.55 },
              { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: true } },
            ),
        });
        return () => split.revert();
      }),
    [],
  );
  return (
    <p ref={ref} className={className}>
      {children}
    </p>
  );
}
