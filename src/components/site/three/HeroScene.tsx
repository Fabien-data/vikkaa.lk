'use client';
import { useEffect, useRef } from 'react';
import { Camera, Mesh, PlaneGeometry, Scene, ShaderMaterial, TextureLoader, Vector2, type Texture } from 'three';
import { createStage, damp } from './stage';

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Cover-fit photo with breathing zoom, scroll parallax, and a liquid ripple + chromatic split around the cursor.
const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes, uImg, uMouse;
uniform float uTime, uAmp, uScroll;
varying vec2 vUv;
void main() {
  float asp = uRes.x / uRes.y;
  vec2 d = (vUv - uMouse) * vec2(asp, 1.0);
  float r = length(d);
  vec2 dir = d / (r + 1e-4);
  float fall = exp(-r * r * 8.0) * uAmp;
  float wave = sin(r * 44.0 - uTime * 2.8) * fall;
  vec2 disp = (dir * wave * 0.011 - d * fall * 0.04) / vec2(asp, 1.0);
  float zoom = 1.07 + 0.018 * sin(uTime * 0.22) + uScroll * 0.14;
  vec2 drift = vec2(sin(uTime * 0.13), cos(uTime * 0.11)) * 0.006 + vec2(0.0, uScroll * 0.05);
  vec2 p = (vUv - 0.5 + disp) / zoom + drift;
  float ri = uImg.x / uImg.y;
  p = p * (asp > ri ? vec2(1.0, ri / asp) : vec2(asp / ri, 1.0)) + 0.5;
  vec2 ca = dir * fall * (0.0022 + abs(wave) * 0.0035) / vec2(asp, 1.0);
  gl_FragColor = vec4(texture2D(uTex, p + ca).r, texture2D(uTex, p).g, texture2D(uTex, p - ca).b, 1.0);
}`;

export default function HeroScene({ image, className = '' }: { image: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const uniforms = {
      uTex: { value: null as Texture | null },
      uRes: { value: new Vector2(1, 1) },
      uImg: { value: new Vector2(1, 1) },
      uMouse: { value: new Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uScroll: { value: 0 },
    };
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false });
    const scene = new Scene();
    scene.add(new Mesh(geometry, material));
    const camera = new Camera();

    // Pointer state. Touch screens have no cursor, so the ripple wanders on its own there.
    const touch = matchMedia('(hover: none)').matches;
    const target = new Vector2(0.5, 0.5);
    let inside = false;
    let speed = 0;
    let amp = 0;
    let top = 0;
    let height = 1;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      speed += Math.hypot(x - target.x, y - target.y);
      target.set(x, y);
    };
    if (!touch) addEventListener('pointermove', onMove, { passive: true });

    const stage = createStage(el, {
      resize(w, h) {
        uniforms.uRes.value.set(w, h);
        top = el.getBoundingClientRect().top + scrollY;
        height = h;
      },
      frame(time, dt) {
        if (!uniforms.uTex.value) return; // nothing to draw until the photo arrives
        uniforms.uTime.value = time;
        const mouse = uniforms.uMouse.value;
        if (touch) {
          target.set(0.5 + 0.28 * Math.sin(time * 0.23), 0.5 + 0.22 * Math.cos(time * 0.17));
          amp = 0.28;
        } else {
          speed *= 1 - damp(4, dt);
          amp += ((inside ? 0.35 + Math.min(speed * 6, 0.65) : 0) - amp) * damp(3, dt);
        }
        mouse.lerp(target, damp(touch ? 1 : 5, dt));
        uniforms.uAmp.value = amp;
        uniforms.uScroll.value = Math.min(Math.max((scrollY - top) / height, 0), 1);
        stage!.renderer.render(scene, camera);
      },
    });
    if (!stage) {
      removeEventListener('pointermove', onMove);
      geometry.dispose();
      material.dispose();
      return;
    }
    stage.canvas.style.opacity = '0';
    stage.canvas.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)';

    let disposed = false;
    const texture = new TextureLoader().load(
      image,
      (t) => {
        if (disposed) return;
        const img = t.image as HTMLImageElement;
        uniforms.uImg.value.set(img.naturalWidth || img.width, img.naturalHeight || img.height);
        uniforms.uTex.value = t;
        stage.canvas.style.opacity = '1';
      },
      undefined,
      () => {}, // the <img> beneath stays as the fallback
    );
    texture.generateMipmaps = false;

    return () => {
      disposed = true;
      removeEventListener('pointermove', onMove);
      stage.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [image]);

  return <div ref={host} aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} />;
}
