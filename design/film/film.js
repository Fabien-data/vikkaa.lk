// Vikkaa brand film. Every frame is a pure function of time: window.__seek(t) poses the whole stage.
import * as THREE from 'three';
import { RoomEnvironment } from './assets/lib/RoomEnvironment.js';
import { DRAW, SCREEN_W, SCREEN_H, drawLive } from './assets/ts/three/screens.js';
import { TICK_PATH } from './assets/ts/tick.js';

const P = new URLSearchParams(location.search);
const V = P.get('format') === 'vertical';
if (V) document.body.classList.add('v');
const W = V ? 1080 : 1920;
const H = V ? 1920 : 1080;
const DUR = 29.5;
const BEAT = 60 / 109.96;
const STEPS = [10.91, 13.1, 15.28, 18.56, 22.92, 26.19];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cues = [];
const cue = (t, name, gain = 1) => cues.push({ t: +t.toFixed(3), name, gain });
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

$$('#s3 path, .report path.t, .sold path.t').forEach((p) => p.setAttribute('d', TICK_PATH));

// Elements whose CSS centring transform GSAP takes over (so GSAP's x/y/scale compose with it).
function centre(sel, xp, yp) {
  $$(sel).forEach((el) => {
    el.style.transform = 'none';
    gsap.set(el, { xPercent: xp, yPercent: yp });
  });
}
centre('#s3 .mark', -50, -50);
centre('#s9 .logo', -50, -50);
centre('#s9 .cta', -50, 0);
centre('.form .toast', -50, 0);
centre('.fbox', -50, -50);
centre('#s7 .badges b', -50, -50);
if (!V) {
  centre('.step .col, #s7 .col', 0, -58);
  centre('.card', 0, -55);
}
// A sea of identical classified ads behind the hero ad, out of focus.
const feed = $('#s1 .feed');
const FEED = V ? [[-380, 120, .62], [560, 260, .58], [-420, 1180, .6], [620, 1320, .6], [100, 1700, .55]] : [[-520, -160, .55], [-460, 520, .5], [1320, -120, .5], [1380, 640, .55], [320, 900, .45], [980, -260, .45]];
FEED.forEach(([x, y, s]) => { const c = $('#s1 .ad.main').cloneNode(true); c.classList.remove('main'); c.style.left = `${x}px`; c.style.top = `${y}px`; c.style.transform = `scale(${s}) rotate(${(x % 7) - 3}deg)`; c.style.transformOrigin = '0 0'; feed.appendChild(c); });
// The hook's camera dives into the phone photo: aim the zoom at its centre.
$('#s1 .wrap').style.transformOrigin = V ? '50% 49.5%' : '49% 58.5%';

// Step rail
$('#rail').innerHTML = ['01', '02', '03', '04', '05'].map((n) => `<div class="st"><span>${n}</span><i><b></b></i></div>`).join('');
const railSteps = $$('#rail .st');
const railBars = $$('#rail .st b');

gsap.defaults({ ease: 'expo.out' });
const tl = gsap.timeline({ paused: true });
const show = (sel, a, b) => {
  tl.set(sel, { display: 'block' }, a);
  if (b != null) tl.set(sel, { display: 'none' }, b);
};
const linesIn = (sel, at, stagger = 0.09, duration = 1.05) => tl.fromTo(`${sel} .line > span`, { yPercent: 112 }, { yPercent: 0, duration, stagger }, at);
const linesOut = (sel, at) => tl.to(`${sel} .line > span`, { yPercent: -112, duration: 0.34, ease: 'power3.in', stagger: 0.04 }, at);

// ---------------- S1: the cliché ----------------
show('#s1', 0, 4.37);
tl.fromTo('#s1', { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0);
tl.fromTo('#s1 .ad.main', { y: 50, opacity: 0, rotation: -4.5 }, { y: 0, opacity: 1, rotation: -2, duration: 1.5 }, 0.12);
tl.fromTo('#s1 .feed', { y: 60, opacity: 0 }, { y: -90, opacity: 1, duration: 4.3, ease: 'none' }, 0);
tl.fromTo('#s1 .wrap', { scale: 1 }, { scale: 1.06, duration: 3.8, ease: 'none' }, 0);
linesIn('#s1 .hook', 0.55, 0.12, 1.1);
tl.to('#s1 .hook', { opacity: 0, duration: 0.25, ease: 'power2.in' }, 3.86);
tl.to('#s1 .wrap', { scale: 3.4, duration: 0.5, ease: 'power3.in' }, 3.87);
tl.to('#s1 .wrap', { filter: 'blur(7px)', duration: 0.42, ease: 'power2.in' }, 3.95);
// Shutter: blades close, flash, open on the cinematic frame.
tl.fromTo('#shutter i', { scaleY: 0 }, { scaleY: 1, duration: 0.08, ease: 'power2.in' }, 4.29);
tl.to('#shutter i', { scaleY: 0, duration: 0.14, ease: 'power2.out' }, 4.37);
tl.fromTo('#flash', { opacity: 0 }, { opacity: 0.9, duration: 0.04, ease: 'none' }, 4.37);
tl.to('#flash', { opacity: 0, duration: 0.32, ease: 'power2.out' }, 4.41);
cue(4.31, 'shutter', 0.85);
cue(4.35, 'whoosh', 0.55);
cue(4.37, 'soft', 0.55);

// ---------------- S2: as cinema ----------------
show('#s2', 4.37, 8.73);
tl.fromTo('#s2 .img', { scale: 1.17, xPercent: -2.2 }, { scale: 1.04, xPercent: 1.4, duration: 4.36, ease: 'power1.out' }, 4.37);
tl.fromTo('#leak', { opacity: 0, xPercent: -45, yPercent: -8 }, { opacity: 0.7, xPercent: 0, yPercent: 0, duration: 1.1, ease: 'power2.out' }, 4.4);
tl.to('#leak', { opacity: 0, xPercent: 45, duration: 1.4, ease: 'power1.in' }, 5.5);
tl.fromTo('#s2 .flare', { opacity: 0, x: -160 }, { opacity: 0.8, x: 40, duration: 2.0, ease: 'sine.inOut' }, 4.55);
tl.to('#s2 .flare', { opacity: 0, duration: 0.8, ease: 'sine.in' }, 6.6);
tl.fromTo('#s2 .brackets', { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55 }, 4.45);
tl.to('#s2 .brackets', { opacity: 0, duration: 0.45, ease: 'power2.in' }, 5.55);
linesIn('#s2 .copy', 5.46, 0.11, 1.15);
linesOut('#s2 .copy', 8.36);
tl.to('#s2 .img', { scale: 1.1, filter: 'brightness(0.55)', duration: 0.37, ease: 'power2.in' }, 8.36);
cue(5.46, 'drop', 0.22);

// ---------------- S3: reveal ----------------
show('#s3', 8.73, 10.91);
tl.fromTo('#s3 .mark', { scale: 1.07 }, { scale: 1, duration: 2.1 }, 8.73);
tl.fromTo('#s3 .stroke', { attr: { 'stroke-dashoffset': 1 }, opacity: 1 }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.62, ease: 'power2.inOut' }, 8.73);
tl.fromTo('#s3 .fill', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 9.22);
tl.fromTo('#s3 .mark img', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'expo.inOut' }, 9.4);
tl.to('#s3 .mark svg', { opacity: 0, duration: 0.25, ease: 'none' }, 9.62);
tl.fromTo('#s3 .tagline', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.85 }, 9.83);
tl.to('#s3 .mark, #s3 .tagline', { opacity: 0, y: -28, duration: 0.28, ease: 'power2.in' }, 10.62);
tl.fromTo('#bg .sheen', { xPercent: -18, yPercent: 10, opacity: 0.5 }, { xPercent: 18, yPercent: -8, opacity: 1, duration: DUR - 8.73, ease: 'none' }, 8.73);
cue(8.73, 'bell', 0.5);
cue(8.73, 'soft', 0.4);

// ---------------- step helpers ----------------
function stepIn(sel, at, card = true) {
  show(sel, at, null);
  tl.fromTo(`${sel} .num`, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.9 }, at);
  linesIn(`${sel} .title`, at + 0.05, 0.08, 0.95);
  tl.fromTo(`${sel} .sub`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.75 }, at + 0.28);
  if (card) tl.fromTo(`${sel} .card`, { y: 130, opacity: 0, rotation: 1.8 }, { y: 0, opacity: 1, rotation: 0, duration: 1.05 }, at + 0.04);
}
function stepOut(sel, at, end) {
  tl.to(`${sel} .col, ${sel} .card`, { opacity: 0, y: '-=44', duration: 0.24, ease: 'power2.in' }, at);
  tl.set(sel, { display: 'none' }, end);
}

// ---------------- S4: 01 tell us ----------------
stepIn('#s4', 10.91);
cue(10.95, 'slide', 0.3);
const typers = $$('.typed').map((el) => ({ el, text: el.dataset.text, start: +el.dataset.start, cps: +el.dataset.cps, input: el.closest('.input') }));
for (const ty of typers)
  for (let i = 0; i < ty.text.length; i++) if (ty.text[i] !== ' ') cue(ty.start + i / ty.cps, `key${1 + Math.floor(rand() * 32)}`, 0.16 + rand() * 0.06);
tl.to('#s4 .send', { scale: 0.965, duration: 0.07, ease: 'power2.out' }, 12.66);
tl.to('#s4 .send', { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 12.73);
tl.fromTo('#s4 .toast', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 12.72);
cue(12.66, 'click', 0.55);
cue(12.74, 'drop', 0.3);
stepOut('#s4', 12.86, 13.1);
tl.set('#cursor', { opacity: 0 }, 12.86);

// ---------------- S5: 02 price ----------------
stepIn('#s5', 13.1);
cue(13.14, 'slide', 0.3);
tl.fromTo('#s5 .bar', { scaleY: 0 }, { scaleY: 1, duration: 0.65, stagger: BEAT / 2 }, 13.37);
$$('#s5 .bar').forEach((_, i) => cue(13.37 + (i * BEAT) / 2, 'tap', 0.18));
tl.fromTo('#s5 .band', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, ease: 'expo.inOut' }, 14.42);
tl.fromTo('#s5 .val', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7 }, 14.5);
tl.fromTo('#s5 path.t', { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.45, ease: 'power2.out' }, 14.74);
cue(14.74, 'soft', 0.45);
stepOut('#s5', 15.04, 15.28);

// ---------------- S6: 03 we film it ----------------
show('#s6', 15.28, 18.56);
tl.set('#shotB, #shotC', { display: 'none' }, 15.28);
tl.fromTo('#s6', { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'none' }, 15.28);
tl.fromTo('#shotA .px', { scale: 1.13 }, { scale: 1.05, duration: 1.3, ease: 'power1.out' }, 15.28);
tl.fromTo('#shotA .px', { filter: 'blur(12px)' }, { filter: 'blur(0px)', duration: 0.5, ease: 'power2.out' }, 15.32);
tl.fromTo('#shotA .fbox', { scale: 1.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4 }, 15.32);
tl.to('#shotA .fbox', { opacity: 0, duration: 0.2 }, 16.15);
// whip A -> B on the beat at 16.37
tl.set('#shotB', { display: 'block' }, 16.3);
tl.to('#shotA', { xPercent: -38, duration: 0.2, ease: 'power2.in' }, 16.26);
tl.to('#hbA feGaussianBlur', { attr: { stdDeviation: '90 0' }, duration: 0.2, ease: 'power2.in' }, 16.26);
tl.fromTo('#shotB', { xPercent: 38 }, { xPercent: 0, duration: 0.28, ease: 'power3.out' }, 16.37);
tl.fromTo('#hbB feGaussianBlur', { attr: { stdDeviation: '90 0' } }, { attr: { stdDeviation: '0 0' }, duration: 0.28, ease: 'power3.out' }, 16.37);
tl.set('#shotA', { display: 'none' }, 16.5);
tl.fromTo('#shotB .px', { scale: 1.2, rotation: 0 }, { scale: 1.04, rotation: 7, duration: 1.4, ease: 'power1.out' }, 16.37);
// whip B -> C on the beat at 17.46
tl.set('#shotC', { display: 'block' }, 17.39);
tl.to('#shotB', { xPercent: -38, duration: 0.2, ease: 'power2.in' }, 17.35);
tl.to('#hbB feGaussianBlur', { attr: { stdDeviation: '90 0' }, duration: 0.2, ease: 'power2.in' }, 17.35);
tl.fromTo('#shotC', { xPercent: 38 }, { xPercent: 0, duration: 0.28, ease: 'power3.out' }, 17.46);
tl.fromTo('#hbC feGaussianBlur', { attr: { stdDeviation: '90 0' } }, { attr: { stdDeviation: '0 0' }, duration: 0.28, ease: 'power3.out' }, 17.46);
tl.set('#shotB', { display: 'none' }, 17.6);
tl.fromTo('#shotC .px', { scale: 1.1, xPercent: 3 }, { scale: 1.04, xPercent: -2.5, duration: 1.2, ease: 'power1.out' }, 17.46);
tl.fromTo('#leak', { opacity: 0, xPercent: -40 }, { opacity: 0.38, xPercent: 0, duration: 0.6, ease: 'power2.out' }, 17.55);
tl.to('#leak', { opacity: 0, xPercent: 40, duration: 0.6, ease: 'power1.in' }, 18.0);
tl.fromTo('#s6 .label', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8 }, 15.4);
tl.fromTo('#s6 .chips span', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 }, 17.6);
tl.to('#s6 .label, #s6 .chips', { opacity: 0, duration: 0.22, ease: 'power2.in' }, 18.32);
tl.to('#s6', { opacity: 0, duration: 0.2, ease: 'power1.in' }, 18.36);
cue(15.28, 'shutter', 0.6);
cue(16.28, 'whoosh', 0.6);
cue(17.37, 'whoosh', 0.6);

// ---------------- S7: 04 every screen ----------------
show('#s7', 18.56, 22.92);
tl.fromTo('#s7 .num', { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.9 }, 18.56);
linesIn('#s7 .title', 18.61, 0.08, 0.95);
tl.fromTo('#s7 .sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.75 }, 18.84);
tl.to('#s7', { opacity: 0, duration: 0.3, ease: 'power1.in' }, 22.62);
cue(18.6, 'whoosh', 0.35);
cue(19.62, 'whoosh', 0.5);
const POPS = [0, 1, 2, 3, 4].map((k) => 20.19 + k * BEAT);
POPS.forEach((t) => cue(t, 'drop', 0.32));

// ---------------- S8: 05 every buyer ----------------
stepIn('#s8', 22.92);
cue(22.96, 'slide', 0.3);
[23.19, 23.46, 24.01].forEach((t, i) => {
  tl.fromTo(`#s8 li:nth-child(${i + 1})`, { opacity: 0, x: 44 }, { opacity: 1, x: 0, duration: 0.65 }, t);
  cue(t, 'drop', 0.26);
});
tl.fromTo('#s8 .sold', { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 0.75, ease: 'back.out(1.7)' }, 24.56);
tl.fromTo('#s8 .sold path.t', { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.42, ease: 'power2.out' }, 24.62);
tl.fromTo('#s8 .sold', { boxShadow: '0 0 0 0px rgba(58,168,118,0.45)' }, { boxShadow: '0 0 0 26px rgba(58,168,118,0)', duration: 1.1, ease: 'power2.out' }, 24.56);
cue(24.56, 'bell', 0.55);
stepOut('#s8', 25.95, 26.19);

// ---------------- S9: outro ----------------
show('#s9', 26.19, null);
tl.fromTo('#s9 .logo', { opacity: 0, scale: 0.94, filter: 'blur(10px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.3 }, 26.19);
tl.fromTo('#s9 .cta', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9 }, 26.73);
tl.fromTo('#s9 .url', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 27.0);
tl.fromTo('#leak', { opacity: 0, xPercent: -30 }, { opacity: 0.28, xPercent: 0, duration: 1.2, ease: 'power2.out' }, 26.3);
tl.to('#leak', { opacity: 0, xPercent: 30, duration: 1.2, ease: 'power1.in' }, 27.6);
tl.fromTo('#fade', { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.in' }, 29.0);
cue(26.19, 'heavy', 0.4);
cue(26.73, 'drop', 0.2);

// rail
tl.fromTo('#rail', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 11.1);
tl.to('#rail', { opacity: 0, duration: 0.3, ease: 'power2.in' }, 25.95);

// ---------------- three.js: five phones ----------------
const gl = { ready: false };
async function init3D() {
  const canvas = $('#gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-3, 4, 6);
  const rim = new THREE.DirectionalLight(0x7fe0b0, 2.2);
  rim.position.set(4, 2, -5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.25));

  const pw = 1.0, ph = 2.17, r = 0.15, depth = 0.07;
  const rr = (w, h, rad) => {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + rad, y);
    s.lineTo(x + w - rad, y);
    s.quadraticCurveTo(x + w, y, x + w, y + rad);
    s.lineTo(x + w, y + h - rad);
    s.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    s.lineTo(x + rad, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - rad);
    s.lineTo(x, y + rad);
    s.quadraticCurveTo(x, y, x + rad, y);
    return s;
  };
  const bodyGeo = new THREE.ExtrudeGeometry(rr(pw, ph, r), { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 5, curveSegments: 14 });
  bodyGeo.translate(0, 0, -depth / 2);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0b2219, metalness: 0.75, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.18 });
  const sw = pw - 0.07, sh = ph - 0.07;
  const screenGeo = new THREE.ShapeGeometry(rr(sw, sh, r - 0.04), 14);
  const pos = screenGeo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / sw + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / sh + 0.5;
  }
  screenGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // Diagonal glare that sweeps across each screen once the fan settles.
  const gc = document.createElement('canvas');
  gc.width = 512; gc.height = 512;
  const g2 = gc.getContext('2d');
  const grad = g2.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0.35, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0)');
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 512, 512);
  const glareTex = new THREE.CanvasTexture(gc);
  glareTex.wrapS = THREE.ClampToEdgeWrapping;

  const imgs = ['villaAhangama', 'villaAerial', 'openAirLiving', 'livingRoom', 'tropicalHouse'];
  const load = (n) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = `assets/img/${n}.jpg`; });
  const photos = await Promise.all(imgs.map(load));
  const phones = DRAW.map((draw, i) => {
    const c = document.createElement('canvas');
    c.width = SCREEN_W; c.height = SCREEN_H;
    draw(c.getContext('2d'), photos[i]);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = depth / 2 + 0.031;
    const glareMat = new THREE.MeshBasicMaterial({ map: glareTex.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    glareMat.map.needsUpdate = true;
    const glare = new THREE.Mesh(screenGeo, glareMat);
    glare.position.z = depth / 2 + 0.033;
    group.add(body, screen, glare);
    scene.add(group);
    return { group, glare };
  });

  // Per-phone animated state, driven by the master timeline.
  const st = phones.map(() => ({ x: 0, y: 0, z: -7, ry: -0.9, rx: 0.12, rz: 0, s: V ? 0.8 : 1 }));
  const cx = V ? 0 : 1.95;
  const cy = V ? -0.95 : -0.08;
  st.forEach((s, i) => {
    const stack = { x: cx + (i - 2) * 0.07, y: cy + i * 0.025, z: -i * 0.14, ry: -0.42, rx: 0.08, rz: 0 };
    const k = i - 2;
    const fan = V
      ? { x: cx + k * 0.47, y: cy - k * k * 0.07, z: -Math.abs(k) * 0.08 + i * 0.002, ry: -k * 0.1, rx: 0.02, rz: -k * 0.11 }
      : { x: cx + k * 1.07, y: cy, z: -k * k * 0.16, ry: -k * 0.15, rx: 0.02, rz: 0 };
    tl.fromTo(s, { x: cx + 0.6, y: cy - 0.4, z: -8 - i * 0.6, ry: -1.1, rx: 0.2, rz: 0 }, { ...stack, duration: 1.0, ease: 'expo.out' }, 18.56 + i * 0.05);
    tl.to(s, { ...fan, duration: 0.85, ease: 'power3.inOut' }, 19.58);
    tl.fromTo(phones[i].glare.material, { opacity: 0 }, { opacity: 0.55, duration: 0.25, ease: 'none' }, 20.4 + i * 0.06);
    tl.fromTo(phones[i].glare.material.map.offset, { x: -0.7, y: 0.7 }, { x: 0.7, y: -0.7, duration: 0.9, ease: 'power1.inOut' }, 20.4 + i * 0.06);
    tl.to(phones[i].glare.material, { opacity: 0, duration: 0.3, ease: 'none' }, 21.0 + i * 0.06);
  });

  const labels = ['TikTok', 'Instagram Reels', 'YouTube', 'Facebook', 'Property portals'];
  $('#s7 .labels').innerHTML = V ? '' : labels.map((l) => `<span>${l}</span>`).join('');
  $('#s7 .badges').innerHTML = labels.map(() => '<b>LIVE</b>').join('');
  centre('#s7 .badges b', -50, -50);
  const badgeEls = $$('#s7 .badges b');
  const labelEls = $$('#s7 .labels span');
  POPS.forEach((t, i) => tl.fromTo(badgeEls[i], { scale: 0 }, { scale: 1, duration: 0.45, ease: 'back.out(2.4)' }, t));
  labelEls.forEach((el, i) => tl.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, POPS[i]));

  const v3 = new THREE.Vector3();
  const toScreen = (obj, x, y, z) => {
    v3.set(x, y, z).applyMatrix4(obj.matrixWorld).project(camera);
    return [(v3.x * 0.5 + 0.5) * W, (-v3.y * 0.5 + 0.5) * H];
  };
  gl.render = (t) => {
    const u = t - 18.56;
    camera.position.set(Math.sin(u * 0.35) * 0.25 + (V ? 0 : 0.5), 0.08, V ? 12.4 : 9.1);
    camera.lookAt(V ? 0 : 0.5, 0, 0);
    phones.forEach(({ group }, i) => {
      const s = st[i];
      const settle = Math.max(0, Math.min(1, (t - 20.4) / 0.6));
      const fy = Math.sin(t * 1.3 + i * 1.1) * 0.025 * settle;
      group.position.set(s.x, s.y + fy, s.z);
      group.rotation.set(s.rx, s.ry + Math.sin(t * 0.9 + i) * 0.02 * settle, s.rz);
      group.scale.setScalar(s.s);
      group.updateMatrixWorld();
      const [bx, by] = toScreen(group, 0.3, ph / 2 - 0.02, 0.06);
      badgeEls[i].style.left = `${bx}px`;
      badgeEls[i].style.top = `${by}px`;
      if (labelEls[i]) {
        const [lx, ly] = toScreen(group, 0, -ph / 2 - 0.2, 0);
        labelEls[i].style.left = `${lx}px`;
        labelEls[i].style.top = `${ly}px`;
      }
    });
    renderer.render(scene, camera);
  };
  gl.ready = true;
}

// ---------------- per-frame details (pure functions of t) ----------------
const pad = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');
const noise = (t, f, s) => Math.sin(t * f + s) * 0.6 + Math.sin(t * f * 2.13 + s * 1.7) * 0.4;
function perFrame(t) {
  for (const ty of typers) {
    const n = Math.max(0, Math.min(ty.text.length, Math.floor((t - ty.start) * ty.cps + 1e-6) + (t >= ty.start ? 1 : 0)));
    ty.el.textContent = ty.text.slice(0, n);
    const done = ty.start + ty.text.length / ty.cps;
    const next = typers[typers.indexOf(ty) + 1];
    const focused = t >= ty.start - 0.12 && t < (next ? next.start - 0.12 : 12.5);
    ty.input.classList.toggle('focus', focused);
    const caret = ty.input.querySelector('.caret');
    caret.style.opacity = focused && (t < done + 0.05 || Math.floor(t * 2.4) % 2 === 0) ? 1 : 0;
  }
  // handheld shake on the REC shot
  const sh = $('#shotA');
  if (t > 15.28 && t < 16.5) gsap.set('#shotA .px', { x: noise(t, 5.1, 1) * 5, y: noise(t, 4.3, 3) * 4 });
  $('.fbox').classList.toggle('lock', t > 15.62);
  $('#shotA .rec i').style.opacity = Math.floor(t * 2) % 2 === 0 ? 1 : 0.25;
  const fr = Math.max(0, Math.round((t - 15.28) * 25)) + 14 * 25 + 12;
  $('#shotA .tc').textContent = `00:00:${pad(fr / 25)}:${pad(fr % 25)}`;
  $('#shotB .alt').textContent = (32 + Math.max(0, Math.min(1.33, t - 16.37)) * 19.5).toFixed(1);
  $('#shotB .tc2').textContent = `00:01:${pad(2 + Math.max(0, t - 16.37))}`;
  $('#shotB .ticks').style.transform = `translateX(${-200 - (t - 16) * 60}px)`;
  void sh;
  // rail
  const idx = STEPS.findIndex((s, i) => t >= s && t < STEPS[i + 1]);
  railSteps.forEach((el, i) => el.classList.toggle('on', i === idx));
  railBars.forEach((b, i) => {
    const p = t >= STEPS[i + 1] ? 1 : t < STEPS[i] ? 0 : (t - STEPS[i]) / (STEPS[i + 1] - STEPS[i]);
    b.style.transform = `scaleX(${p})`;
  });
}

// The cursor path needs the settled layout, so it is measured once the timeline exists.
function addCursor() {
  tl.seek(12.6, true);
  perFrame(12.6);
  const send = $('#s4 .send').getBoundingClientRect();
  const price = $('#s4 .input[data-i="2"]').getBoundingClientRect();
  const from = { x: price.right - 60, y: price.bottom + 20 };
  const to = { x: send.left + send.width * 0.62, y: send.top + send.height * 0.5 };
  tl.fromTo('#cursor', { opacity: 0, x: from.x, y: from.y }, { opacity: 1, duration: 0.15, ease: 'none' }, 12.32);
  tl.to('#cursor', { x: to.x, y: to.y, duration: 0.32, ease: 'power3.inOut' }, 12.34);
  tl.to('#cursor', { scale: 0.85, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 12.66);
  tl.seek(0, true);
}

window.__cues = cues;
window.__DUR = DUR;
window.__seek = async (t) => {
  tl.seek(t, true);
  perFrame(t);
  if (gl.ready && t >= 18.5 && t <= 22.95) gl.render(t);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = (async () => {
  await document.fonts.load('400 80px "Instrument Serif"');
  await document.fonts.load('italic 400 80px "Instrument Serif"');
  await document.fonts.load('600 40px Hanken');
  await document.fonts.ready;
  await Promise.all($$('img').map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => (im.onload = r)))));
  await init3D();
  addCursor();
  cues.sort((a, b) => a.t - b.t);
  return true;
})();
