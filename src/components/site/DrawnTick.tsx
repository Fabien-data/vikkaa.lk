import { TICK_PATH, TICK_VIEWBOX } from './tick';

/** The brand tick as line art that draws itself on page load (CSS only). Decorative; size and colour it with className. */
export function DrawnTick({ className, width = 1.2, delay = 300 }: { className?: string; width?: number; delay?: number }) {
  return (
    <svg viewBox={TICK_VIEWBOX} className={className} aria-hidden="true" fill="none">
      <path d={TICK_PATH} stroke="currentColor" strokeWidth={width} strokeLinejoin="round" pathLength={1} className="draw-tick" style={{ animationDelay: `${delay}ms` }} />
    </svg>
  );
}
