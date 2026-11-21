'use client';
import { useEffect, useSyncExternalStore, type RefObject } from 'react';
import { FILM } from './chapters';

const PORTRAIT = '(max-aspect-ratio: 1/1)';
const subscribe = (cb: () => void) => {
  const m = matchMedia(PORTRAIT);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};

/**
 * The cut of the film for this screen: vertical on portrait screens, landscape otherwise (server and hydration: landscape).
 * Both sections use the same cut, so a visitor downloads one file.
 */
export function useFilmCut() {
  const portrait = useSyncExternalStore(subscribe, () => matchMedia(PORTRAIT).matches, () => false);
  return portrait ? FILM.vertical : FILM.landscape;
}

/** Plays a muted video while it is on screen and the tab is visible; pauses it otherwise. */
export function usePlayWhileVisible(ref: RefObject<HTMLVideoElement | null>, enabled: boolean, src?: string) {
  useEffect(() => {
    const video = ref.current;
    if (!video || !enabled) return;
    let onScreen = false;
    const sync = () => (onScreen && !document.hidden ? video.play().catch(() => {}) : video.pause());
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    });
    io.observe(video);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      video.pause();
    };
  }, [ref, enabled, src]);
}
