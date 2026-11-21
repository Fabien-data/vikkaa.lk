'use client';
import dynamic from 'next/dynamic';
import { useCallback, useRef, useState } from 'react';
import { useNear, useReducedMotion } from './hooks';

// three.js only ever loads in these client-only chunks, never in the page bundle or the server render.
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });
const IslandScene = dynamic(() => import('./IslandScene'), { ssr: false });
const IslandFallback = dynamic(() => import('./IslandFallback'), { ssr: false });

export { EveryScreen } from './EveryScreen';

/** WebGL layer over the hero photo. Fills its positioned parent (absolute inset-0). Client-only; the <img> beneath stays the LCP and fallback. */
export function HeroCanvas({ image, className }: { image: string; className?: string }) {
  return useReducedMotion() ? null : <HeroScene image={image} className={className} />;
}

/** 3D dot-matrix Sri Lanka with Western Province pins. Fills its positioned parent; the parent supplies the copy. Client-only. */
export function IslandMap({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNear(ref);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {near && (reduced || failed ? <IslandFallback /> : <IslandScene onFail={onFail} />)}
    </div>
  );
}
