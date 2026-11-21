'use client';
import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { createStage, damp } from './stage';
import { dots, PINS, project, relief } from './lanka';

const FOV = 32;
const LABELLED = PINS.filter((p) => p.label);
const LABEL_AT = LABELLED.map((p) => PINS.indexOf(p));
// Inland towns are labelled to the east (right) so they don't sit on the coastal pins.
const RIGHT = LABELLED.map((p) => p.lon > 80);

// Dots: kind 0 = rest of the island, 1 = Western Province, 2 = pin head. A slow signal wave rolls out from Colombo.
const dotVert = /* glsl */ `
attribute float aKind;
attribute float aRand;
uniform float uTime, uScale, uDpr;
uniform vec2 uOrigin;
varying float vKind, vGlow;
void main() {
  vKind = aKind;
  float d = distance(position.xz, uOrigin);
  float wave = fract(uTime * 0.12) * 4.5;
  vGlow = exp(-pow((d - wave) * 5.0, 2.0)) * (1.0 - wave / 4.5) + 0.12 * sin(uTime * 1.7 + aRand * 40.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float size = aKind > 1.5 ? 0.04 : aKind > 0.5 ? 0.021 : 0.017;
  gl_PointSize = size * uScale * uDpr / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const dotFrag = /* glsl */ `
uniform vec3 uDim, uMint;
varying float vKind, vGlow;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.55, r);
  vec3 col = vKind > 1.5 ? vec3(1.0) : vKind > 0.5 ? uMint : uDim;
  float alpha = (vKind > 1.5 ? 1.0 : vKind > 0.5 ? 0.95 : 0.5) + vGlow * 0.6;
  gl_FragColor = vec4(col * a * alpha, a * alpha);
}`;

// Beams: two crossed planes per pin, a soft gradient that fades upwards and flickers a little.
const beamVert = /* glsl */ `
attribute float aPhase;
varying vec2 vUv;
varying float vPhase;
void main() { vUv = uv; vPhase = aPhase; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`;
const beamFrag = /* glsl */ `
uniform float uTime, uShow;
uniform vec3 uMint;
varying vec2 vUv;
varying float vPhase;
void main() {
  float x = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float a = pow(1.0 - vUv.y, 1.8) * x * x * (0.8 + 0.2 * sin(uTime * 3.0 + vPhase * 6.28)) * uShow;
  vec3 col = mix(uMint, vec3(1.0), x * x * (1.0 - vUv.y));
  gl_FragColor = vec4(col * a, a);
}`;

// Rings: flat ripples that expand and fade around each pin.
const ringFrag = /* glsl */ `
uniform float uTime, uShow;
uniform vec3 uMint;
varying vec2 vUv;
varying float vPhase;
void main() {
  float t = fract(uTime * 0.45 + vPhase);
  float r = length(vUv - 0.5) * 2.0;
  float a = smoothstep(0.08, 0.0, abs(r - t)) * (1.0 - t) * 1.4 * uShow;
  gl_FragColor = vec4(uMint * a, a);
}`;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const expoOut = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));

export default function IslandScene({ onFail }: { onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const labelEls = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = host.current!;
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.1, 80);
    const island = new Group();
    scene.add(island);
    const mint = new Color('#b5e8cd');

    // The dot field, plus one bright dot per pin.
    const grid = dots(innerWidth < 768 ? 0.037 : 0.032);
    const count = grid.length + PINS.length;
    const pos = new Float32Array(count * 3);
    const kind = new Float32Array(count);
    const rand = new Float32Array(count);
    grid.forEach(([x, y, west, lon, lat], i) => {
      pos.set([x, relief(lon, lat) + Math.random() * 0.02, -y], i * 3);
      kind[i] = west ? 1 : 0;
      rand[i] = Math.random();
    });
    const pinPos = PINS.map(({ lon, lat }) => {
      const [x, y] = project(lon, lat);
      return new Vector3(x, relief(lon, lat) + 0.02, -y);
    });
    pinPos.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], (grid.length + i) * 3);
      kind[grid.length + i] = 2;
    });
    const dotGeo = new BufferGeometry();
    dotGeo.setAttribute('position', new BufferAttribute(pos, 3));
    dotGeo.setAttribute('aKind', new BufferAttribute(kind, 1));
    dotGeo.setAttribute('aRand', new BufferAttribute(rand, 1));
    const [ox, oy] = project(79.8612, 6.9271);
    const dotMat = new ShaderMaterial({
      vertexShader: dotVert,
      fragmentShader: dotFrag,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uDpr: { value: 1 },
        uOrigin: { value: new Vector2(ox, -oy) },
        uDim: { value: new Color('#3aa876') },
        uMint: { value: mint },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
    });
    island.add(new Points(dotGeo, dotMat));

    // Beams and rings, instanced per pin. Colombo's beam is the tallest.
    const shared = { uTime: { value: 0 }, uShow: { value: 0 }, uMint: { value: mint } };
    const phases = (per: number) => new InstancedBufferAttribute(new Float32Array(PINS.length * per).map((_, i) => Math.floor(i / per) / PINS.length), 1);
    const beamGeo = new PlaneGeometry(0.07, 1).translate(0, 0.5, 0);
    beamGeo.setAttribute('aPhase', phases(2));
    const beamMat = new ShaderMaterial({
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
    });
    const beams = new InstancedMesh(beamGeo, beamMat, PINS.length * 2);
    const ringGeo = new PlaneGeometry(0.38, 0.38).rotateX(-Math.PI / 2);
    ringGeo.setAttribute('aPhase', phases(1));
    const ringMat = new ShaderMaterial({
      vertexShader: beamVert,
      fragmentShader: ringFrag,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      premultipliedAlpha: true,
    });
    const rings = new InstancedMesh(ringGeo, ringMat, PINS.length);
    const m = new Matrix4();
    const heights = PINS.map((p, i) => (i === 0 ? 0.75 : p.label ? 0.5 : 0.34));
    pinPos.forEach((p, i) => {
      for (let k = 0; k < 2; k++) {
        m.makeRotationY((k * Math.PI) / 2).scale(new Vector3(1, heights[i], 1)).setPosition(p);
        beams.setMatrixAt(i * 2 + k, m);
      }
      rings.setMatrixAt(i, m.makeTranslation(p.x, p.y + 0.005, p.z));
    });
    beams.frustumCulled = rings.frustumCulled = false;
    island.add(beams, rings);

    // Camera: from high and wide over the whole island, down towards the Western Province.
    const center = new Vector3(0, 0, 0);
    const [wx, wy] = project(79.98, 6.95);
    const west = new Vector3(wx, 0, -wy);
    const look = new Vector3();
    const lookFrom = center.clone();
    const lookTo = new Vector3();
    const offFrom = new Vector3(0, 11, 0.8);
    const offTo = new Vector3(0.3, 4.3, 3.9);
    let fit = 1;

    const pointer = new Vector2();
    const tilt = new Vector2();
    const onMove = (e: PointerEvent) => pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    addEventListener('pointermove', onMove, { passive: true });

    let introAt = -1;
    let started = false;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (started = true), { threshold: 0.35 });
    io.observe(el);

    const v = new Vector3();
    let W = 1;
    let H = 1;
    let shownLabels = -1;

    const stage = createStage(el, {
      antialias: false,
      resize(w, h) {
        W = w;
        H = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        dotMat.uniforms.uScale.value = (h / (2 * Math.tan((FOV * Math.PI) / 360))) * (w / h < 1 ? 1.35 : 1); // fatter dots when the island is small
        dotMat.uniforms.uDpr.value = stage!.renderer.getPixelRatio();
        // Narrow boxes need the camera further back (the island is about 2.3 units wide) and less of a lean west.
        // On phones the town labels sit in the sea to the west, so leave them room on the left.
        fit = Math.max(0.9, 1.1 / (w / h));
        lookTo.lerpVectors(center, west, w / h < 1 ? 0.45 : 0.5);
      },
      frame(time, dt) {
        if (started && introAt < 0) introAt = time;
        const k = introAt < 0 ? 0 : expoOut(clamp01((time - introAt) / 3.2));
        tilt.lerp(pointer, damp(2, dt));
        island.rotation.y = Math.sin(time * 0.1) * 0.1 + tilt.x * 0.14;
        island.rotation.x = tilt.y * 0.05;
        look.lerpVectors(lookFrom, lookTo, k);
        camera.position.lerpVectors(offFrom, offTo, k).multiplyScalar(fit).add(look);
        camera.lookAt(look);
        dotMat.uniforms.uTime.value = time;
        shared.uTime.value = time;
        shared.uShow.value = clamp01(k * 1.6 - 0.3);
        stage!.renderer.render(scene, camera);

        const show = clamp01(k * 2 - 1);
        for (let i = 0; i < LABEL_AT.length; i++) {
          const label = labelEls.current[i];
          if (!label || !show) continue;
          const j = LABEL_AT[i];
          v.copy(pinPos[j]).applyMatrix4(island.matrixWorld).project(camera);
          label.style.transform = `translate3d(${((v.x + 1) / 2) * W}px,${((1 - v.y) / 2) * H}px,0) translate(${RIGHT[i] ? '10px' : 'calc(-100% - 10px)'},-50%)`;
        }
        if (show !== shownLabels) {
          shownLabels = show;
          for (const l of labelEls.current) if (l) l.style.opacity = String(show);
        }
      },
    });
    if (!stage) {
      io.disconnect();
      removeEventListener('pointermove', onMove);
      onFail();
      return;
    }
    stage.canvas.style.opacity = '0';
    stage.canvas.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
    requestAnimationFrame(() => (stage.canvas.style.opacity = '1'));

    return () => {
      io.disconnect();
      removeEventListener('pointermove', onMove);
      stage.dispose();
      for (const o of [dotGeo, dotMat, beamGeo, beamMat, ringGeo, ringMat]) o.dispose();
      beams.dispose();
      rings.dispose();
    };
  }, [onFail]);

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div ref={host} className="absolute inset-0" />
      {LABELLED.map((p, i) => (
        <span
          key={p.name}
          ref={(n) => {
            labelEls.current[i] = n;
          }}
          className={`eyebrow pointer-events-none absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap text-[10px] text-mint opacity-0 [text-shadow:0_1px_10px_#03150f] ${RIGHT[i] ? 'flex-row-reverse' : ''} ${i === 2 ? 'max-md:hidden' : ''}`}
        >
          {p.name}
          <span className="h-px w-5 bg-mint/50" />
        </span>
      ))}
    </div>
  );
}
