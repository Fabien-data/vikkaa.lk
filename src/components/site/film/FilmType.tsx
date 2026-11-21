'use client';
import { useRef } from 'react';
import { useNear, useReducedMotion } from '../three/hooks';
import { useFilmCut, usePlayWhileVisible } from './hooks';

/**
 * Shows the brand film only through the white type in `children`, on a night background.
 * Stack inside one isolated group: film, a faint mint lift (dark frames still light the letters),
 * the type multiplied over it (white shows film, black hides it), then night "lightened" over the black.
 * With reduced motion the letters hold the poster frame instead.
 */
export function FilmType({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const near = useNear(box);
  const reduced = useReducedMotion();
  const cut = useFilmCut();
  const play = near && !reduced;
  usePlayWhileVisible(video, play, cut.src);

  return (
    <div ref={box} className={`relative isolate overflow-hidden ${className}`}>
      <video
        ref={video}
        aria-hidden="true"
        tabIndex={-1}
        src={play ? cut.src : undefined}
        poster={cut.poster}
        preload="none"
        muted
        loop
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        className="absolute inset-0 size-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[rgb(181_232_205/0.3)] mix-blend-screen" />
      <div className="relative bg-black text-white mix-blend-multiply">{children}</div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-night mix-blend-lighten" />
    </div>
  );
}
