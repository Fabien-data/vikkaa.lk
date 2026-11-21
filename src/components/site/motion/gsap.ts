'use client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

/** Run animation setup only when the visitor hasn't asked for reduced motion. Returns the cleanup. */
export function whenMotionOk(setup: () => void | (() => void)) {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', setup);
  return () => mm.revert();
}
