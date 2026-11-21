'use client';
import { useEffect, useRef, type RefObject } from 'react';
import {
  CanvasTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createStage, damp } from './stage';
import { DRAW, drawLive, SCREEN_H, SCREEN_W } from './screens';

const PW = 1; // phone body, world units at scale 1
const PH = 2.16;
const DEPTH = 0.07;
const BEVEL = 0.025;
const SW = PW - 0.08; // screen
const SH = SW * (SCREEN_H / SCREEN_W);
const FOV = 30;
const CAM_Z = 14;
const N = 5;

function roundedRect(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const back = (x: number) => (x <= 0 ? 0 : 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Props = {
  images: string[];
  labels: readonly string[];
  /** Scroll progress through the pinned track, 0..1, written by the section. */
  progress: RefObject<number>;
  /** The copy block, so the phones keep clear of it. */
  copy: RefObject<HTMLElement | null>;
  onFail: () => void;
};

export default function PhonesScene({ images, labels, progress, copy, onFail }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labelEls = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = host.current!;
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
    camera.position.z = CAM_Z;
    const rig = new Group();
    scene.add(rig);
    const key = new DirectionalLight('#ffffff', 0.9);
    key.position.set(3, 5, 8);
    const rim = new DirectionalLight('#3aa876', 7);
    rim.position.set(-6, 4, -3);
    const fill = new DirectionalLight('#b5e8cd', 1.6);
    fill.position.set(6, -3, 2);
    scene.add(key, rim, fill);

    const bodyGeo = new ExtrudeGeometry(roundedRect(PW - BEVEL * 2, PH - BEVEL * 2, 0.15), {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 4,
      curveSegments: 10,
    });
    bodyGeo.translate(0, 0, -DEPTH / 2);
    const screenGeo = new ShapeGeometry(roundedRect(SW, SH, 0.11), 10);
    const uv = screenGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / SW + 0.5, uv.getY(i) / SH + 0.5);
    const liveGeo = new PlaneGeometry(0.44, 0.15);
    const bodyMat = new MeshStandardMaterial({ color: '#14291f', metalness: 0.8, roughness: 0.26 });

    const liveCanvas = Object.assign(document.createElement('canvas'), { width: 256, height: 88 });
    drawLive(liveCanvas.getContext('2d')!);
    const liveTex = new CanvasTexture(liveCanvas);
    liveTex.colorSpace = SRGBColorSpace;
    const liveMat = new MeshBasicMaterial({ map: liveTex, transparent: true });

    const phones: Group[] = [];
    const lives: Mesh[] = [];
    const textures: CanvasTexture[] = [];
    const screenMats: MeshStandardMaterial[] = [];
    const loaders: HTMLImageElement[] = [];
    for (let i = 0; i < N; i++) {
      const canvas = Object.assign(document.createElement('canvas'), { width: SCREEN_W, height: SCREEN_H });
      const ctx = canvas.getContext('2d')!;
      DRAW[i](ctx, null);
      const tex = new CanvasTexture(canvas);
      tex.colorSpace = SRGBColorSpace;
      textures.push(tex);
      const src = images[i % images.length];
      if (src) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          DRAW[i](ctx, img);
          tex.needsUpdate = true;
        };
        img.src = src;
        loaders.push(img);
      }
      const screenMat = new MeshStandardMaterial({
        color: '#000000',
        emissive: '#ffffff',
        emissiveMap: tex,
        roughness: 0.16,
        metalness: 0,
        envMapIntensity: 0.55,
      });
      screenMats.push(screenMat);
      const phone = new Group();
      const screen = new Mesh(screenGeo, screenMat);
      screen.position.z = DEPTH / 2 + BEVEL + 0.002;
      const live = new Mesh(liveGeo, liveMat);
      live.position.set(-PW / 2 + 0.3, PH / 2 - 0.02, DEPTH / 2 + BEVEL + 0.03);
      live.scale.setScalar(0.0001);
      lives.push(live);
      phone.add(new Mesh(bodyGeo, bodyMat), screen, live);
      phone.renderOrder = N - i;
      rig.add(phone);
      phones.push(phone);
    }

    // Poses per beat: [x, y, z, rx, ry, rz, scale] for each phone, in world units, rebuilt on resize.
    const stack = new Float32Array(N * 7);
    const row = new Float32Array(N * 7);
    const arc = { x: 0, y: 0, s: 1, r: 3 };
    let unit = 1; // world units per CSS pixel at z = 0
    let W = 1;
    let H = 1;

    const pointer = new Vector2();
    const tilt = new Vector2();
    const onMove = (e: PointerEvent) => pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    addEventListener('pointermove', onMove, { passive: true });

    const v = new Vector3();
    const shown = new Float32Array(N).fill(-1);
    let smooth = progress.current ?? 0;
    let painted = false;

    const stage = createStage(el, {
      antialias: true,
      resize(w, h) {
        W = w;
        H = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        unit = (2 * CAM_Z * Math.tan((FOV * Math.PI) / 360)) / h;
        const wx = (px: number) => (px - w / 2) * unit;
        const wy = (py: number) => (h / 2 - py) * unit;
        const c = copy.current;
        const top = c ? c.offsetTop + c.offsetHeight + 44 : h * 0.4;
        const wide = w >= 900 && w / h > 1.15;
        const label = 46;
        const zone = h - top - label - (wide ? 28 : 18);

        // Beat 1 and 2 sit to the right of the copy on wide screens, below it on narrow ones.
        const cx = wide ? w * 0.68 : w / 2;
        const cy = wide ? h * 0.54 : top + (h - top) / 2;
        const heroPx = wide ? Math.min(h * 0.72, w * 0.34) : Math.min(zone * 0.85, w * 0.95);
        const s1 = (heroPx * unit) / PH;
        for (let i = 0; i < N; i++)
          stack.set([wx(cx) + i * 0.17 * s1, wy(cy) + i * 0.02 * s1, -i * 0.3 * s1, -0.08, -0.68, 0.08, s1], i * 7);
        arc.x = wx(cx);
        arc.y = wy(cy);
        arc.s = s1 * (wide ? 0.8 : 0.56);
        arc.r = (wide ? 3.4 : 2.1) * arc.s;

        // Beat 3: one row on wide screens, three over two on narrow ones.
        const gap = 0.28;
        if (wide) {
          const pxH = Math.min(zone, ((w * 0.84) / (N + (N - 1) * gap)) * PH);
          const s = (pxH * unit) / PH;
          const y = wy(top + zone / 2 + 8);
          for (let i = 0; i < N; i++) row.set([(i - 2) * (1 + gap) * s * PW, y, 0, 0, 0, 0, s], i * 7);
        } else {
          const pxH = Math.min((zone - label) / 2, ((w * 0.86) / (3 + 2 * gap)) * PH);
          const s = (pxH * unit) / PH;
          for (let i = 0; i < N; i++) {
            const r = i < 3 ? 0 : 1;
            const col = r ? i - 3.5 : i - 1;
            row.set([col * (1 + gap) * s * PW, wy(top + pxH / 2 + r * (pxH + label) + 6), 0, 0, 0, 0, s], i * 7);
          }
        }
      },
      frame(time, dt) {
        smooth += ((progress.current ?? 0) - smooth) * damp(6, dt);
        const p = smooth;
        tilt.lerp(pointer, damp(2.5, dt));
        rig.rotation.set(tilt.y * 0.07, tilt.x * 0.12, 0);
        const orbit = (p - 0.5) * 0.7 + Math.sin(time * 0.25) * 0.04;

        for (let i = 0; i < N; i++) {
          const a = ease(clamp01((p - 0.14 - i * 0.03) / 0.26));
          const b = ease(clamp01((p - 0.56 - (N - 1 - i) * 0.025) / 0.24));
          const o = i * 7;
          // Beat 2: an arc around a point behind the phones, drifting with scroll.
          const ang = (i - 2) * 0.5 + orbit;
          const ax = arc.x + Math.sin(ang) * arc.r;
          const az = (Math.cos(ang) - 1) * arc.r;
          const ay = arc.y + Math.cos(ang * 2) * 0.12 * arc.s;
          const bob = Math.sin(time * 0.9 + i * 1.3) * 0.035 * (1 - b * 0.6);
          const ph = phones[i];
          ph.position.set(
            mix(mix(stack[o], ax, a), row[o], b),
            mix(mix(stack[o + 1], ay, a), row[o + 1], b) + bob,
            mix(mix(stack[o + 2], az, a), row[o + 2], b),
          );
          ph.rotation.set(
            mix(mix(stack[o + 3] + Math.sin(time * 0.4) * 0.03, -0.04, a), 0, b),
            mix(mix(stack[o + 4] + Math.sin(time * 0.3) * 0.08, ang, a), 0, b),
            mix(mix(stack[o + 5], (i - 2) * -0.03, a), 0, b),
          );
          ph.scale.setScalar(mix(mix(stack[o + 6], arc.s, a), row[o + 6], b));
          lives[i].scale.setScalar(Math.max(back(clamp01((p - 0.78 - i * 0.025) / 0.07)), 0.0001));
        }
        stage!.renderer.render(scene, camera);

        for (let i = 0; i < N; i++) {
          const label = labelEls.current[i];
          if (!label) continue;
          const t = clamp01((p - 0.78 - i * 0.025) / 0.08);
          if (t > 0) {
            v.set(0, -PH / 2 - 0.06, 0).applyMatrix4(phones[i].matrixWorld).project(camera);
            label.style.transform = `translate3d(${((v.x + 1) / 2) * W}px,${((1 - v.y) / 2) * H + (1 - t) * 10}px,0) translateX(-50%)`;
          }
          if (shown[i] !== t) label.style.opacity = String((shown[i] = t));
        }
        if (!painted) {
          painted = true;
          stage!.canvas.style.opacity = '1';
        }
      },
    });
    if (!stage) {
      onFail();
      return () => removeEventListener('pointermove', onMove);
    }
    stage.canvas.style.opacity = '0';
    stage.canvas.style.transition = 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1)';
    const maxAniso = stage.renderer.capabilities.getMaxAnisotropy();
    for (const t of textures) t.anisotropy = Math.min(8, maxAniso);
    const pmrem = new PMREMGenerator(stage.renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = 0.9;

    return () => {
      removeEventListener('pointermove', onMove);
      for (const img of loaders) img.onload = null;
      stage.dispose();
      env.dispose();
      bodyGeo.dispose();
      screenGeo.dispose();
      liveGeo.dispose();
      bodyMat.dispose();
      liveMat.dispose();
      liveTex.dispose();
      for (const m of screenMats) m.dispose();
      for (const t of textures) t.dispose();
    };
  }, [images, progress, copy, onFail]);

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div ref={host} className="absolute inset-0" />
      {labels.map((l, i) => (
        <span
          key={l}
          ref={(n) => {
            labelEls.current[i] = n;
          }}
          className="eyebrow pointer-events-none absolute left-0 top-0 whitespace-nowrap text-[10px] text-white/80 opacity-0 md:text-[11px]"
        >
          {l}
        </span>
      ))}
    </div>
  );
}
