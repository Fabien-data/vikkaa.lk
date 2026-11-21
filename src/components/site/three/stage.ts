import { WebGLRenderer } from 'three';

type Options = {
  antialias?: boolean;
  /** Called with the CSS size whenever the host resizes (and once at start). */
  resize: (width: number, height: number) => void;
  /** Called every frame while the host is on screen and the tab is visible. `dt` is in seconds, capped. */
  frame: (time: number, dt: number) => void;
};

export type Stage = { renderer: WebGLRenderer; canvas: HTMLCanvasElement; dispose: () => void };

/**
 * One WebGL renderer on a fresh canvas inside `host`, sized to it, with the DPR capped and the loop paused
 * while off screen or the tab is hidden. Returns null when WebGL2 isn't available, without logging.
 */
export function createStage(host: HTMLElement, { antialias = false, resize, frame }: Options): Stage | null {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  const attributes = { alpha: true, antialias, premultipliedAlpha: true, powerPreference: 'high-performance' } as const;
  const context = canvas.getContext('webgl2', attributes) as WebGL2RenderingContext | null;
  if (!context) return null;
  const renderer = new WebGLRenderer({ canvas, context, ...attributes });
  host.appendChild(canvas);

  let visible = false;
  let running = false;
  let last = 0;
  const loop = (time: number) => {
    const dt = Math.min((time - last) / 1000, 0.1);
    last = time;
    frame(time / 1000, dt);
  };
  const sync = () => {
    const run = visible && !document.hidden;
    if (run === running) return;
    running = run;
    last = performance.now();
    renderer.setAnimationLoop(run ? loop : null);
  };

  const ro = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    // Phone canvases are small, so full 2x stays cheap and keeps the on-screen UI crisp; big desktop canvases cap lower.
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 2 : 1.75));
    renderer.setSize(w, h, false);
    resize(w, h);
  });
  ro.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  io.observe(host);
  document.addEventListener('visibilitychange', sync);

  return {
    renderer,
    canvas,
    dispose() {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss(); // the canvas is discarded, so free its context now rather than at GC
      canvas.remove();
    },
  };
}

/** Frame-rate independent smoothing factor for `x += (target - x) * k`. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
