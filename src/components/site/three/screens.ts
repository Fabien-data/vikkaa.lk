// Phone-screen textures for EveryScreen: one property photo per screen with generic, logo-free platform UI drawn over it.
import { TICK_PATH } from '../tick';

export const SCREEN_W = 480;
export const SCREEN_H = 1064;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
type Ctx = CanvasRenderingContext2D;
type Img = HTMLImageElement | null;

// Icon outlines on a 24-unit grid (drawn in the style of Lucide, ISC).
const ICON = {
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  bubble: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4Z',
  share: 'm15 17 5-5-5-5M4 18v-2a4 4 0 0 1 4-4h12',
  bookmark: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z',
  thumb: 'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z',
  search: 'm21 21-4.34-4.34M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  pin: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  menu: 'M4 6h16M4 12h16M4 18h16',
} as const;
const paths = new Map<string, Path2D>();
const path = (d: string) => paths.get(d) ?? (paths.set(d, new Path2D(d)), paths.get(d)!);

function icon(c: Ctx, name: keyof typeof ICON, x: number, y: number, size: number, color: string, fill = false) {
  c.save();
  c.translate(x - size / 2, y - size / 2);
  c.scale(size / 24, size / 24);
  c.lineWidth = 2;
  c.lineCap = c.lineJoin = 'round';
  c.strokeStyle = c.fillStyle = color;
  if (fill) c.fill(path(ICON[name]));
  else c.stroke(path(ICON[name]));
  c.restore();
}

function text(c: Ctx, s: string, x: number, y: number, size: number, color: string, weight = 500, align: CanvasTextAlign = 'left') {
  c.font = `${weight} ${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.fillText(s, x, y);
  return c.measureText(s).width;
}

/** Word-wrapped text; returns the y below the last line. */
function para(c: Ctx, s: string, x: number, y: number, maxW: number, size: number, color: string, weight = 500) {
  c.font = `${weight} ${size}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = 'left';
  let line = '';
  for (const word of s.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > maxW && line) {
      c.fillText(line, x, y);
      line = word;
      y += size * 1.32;
    } else line = next;
  }
  c.fillText(line, x, y);
  return y + size * 1.32;
}

/** The photo, cover-fitted into a (rounded) rect; a deep-green placeholder until it loads. */
function photo(c: Ctx, img: Img, x: number, y: number, w: number, h: number, r = 0, zoom = 1, fx = 0.5) {
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.clip();
  if (img?.naturalWidth) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    c.drawImage(img, x + (w - dw) * fx, y + (h - dh) / 2, dw, dh);
  } else {
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#1d6649');
    g.addColorStop(1, '#03150f');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  }
  c.restore();
}

function shade(c: Ctx, y0: number, y1: number, a0: number, a1: number) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(0,0,0,${a0})`);
  g.addColorStop(1, `rgba(0,0,0,${a1})`);
  c.fillStyle = g;
  c.fillRect(0, y0, SCREEN_W, y1 - y0);
}

function pill(c: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  c.beginPath();
  c.roundRect(x, y, w, h, h / 2);
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 2;
    c.stroke();
  } else {
    c.fillStyle = fill;
    c.fill();
  }
}

/** Vikkaa's avatar: the tick on deep green. */
function avatar(c: Ctx, x: number, y: number, r: number, ring?: string) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = '#0b281e';
  c.fill();
  if (ring) {
    c.strokeStyle = ring;
    c.lineWidth = 3;
    c.stroke();
  }
  c.save();
  const s = (r * 1.15) / 400;
  c.translate(x - 200 * s, y - 172 * s);
  c.scale(s, s);
  c.fillStyle = '#fff';
  c.fill(path(TICK_PATH));
  c.restore();
}

function status(c: Ctx, color: string) {
  text(c, '9:41', 44, 50, 22, color, 600);
  for (let i = 0; i < 4; i++) {
    c.fillStyle = color;
    c.fillRect(360 + i * 9, 46 - (i + 1) * 4.5, 6, (i + 1) * 4.5);
  }
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(406, 31, 34, 17, 5);
  c.stroke();
  c.fillStyle = color;
  c.fillRect(409, 34, 24, 11);
}

function tiktok(c: Ctx, img: Img) {
  photo(c, img, 0, 0, SCREEN_W, SCREEN_H, 0, 1.02);
  shade(c, 0, 220, 0.45, 0);
  shade(c, 640, SCREEN_H, 0, 0.75);
  status(c, '#fff');
  text(c, 'Following', 190, 120, 24, 'rgba(255,255,255,.65)', 600, 'right');
  text(c, 'For You', 222, 120, 24, '#fff', 700);
  c.fillStyle = '#fff';
  c.fillRect(250, 134, 40, 4);
  icon(c, 'search', 432, 112, 30, '#fff');
  avatar(c, 424, 560, 30, '#fff');
  c.beginPath();
  c.arc(424, 592, 11, 0, Math.PI * 2);
  c.fillStyle = '#ee1c25';
  c.fill();
  text(c, '+', 424, 599, 20, '#fff', 700, 'center');
  icon(c, 'heart', 424, 672, 48, '#fff', true);
  icon(c, 'bubble', 424, 768, 46, '#fff', true);
  icon(c, 'bookmark', 424, 862, 42, '#fff', true);
  icon(c, 'share', 424, 950, 44, '#fff');
  text(c, '@vikkaa.lk', 30, 916, 26, '#fff', 700);
  const y = para(c, 'Pool villa in Ahangama. Drone, walkthrough and every room.', 30, 956, 340, 22, 'rgba(255,255,255,.92)');
  text(c, '#srilanka #villa #forsale', 30, y + 4, 21, 'rgba(255,255,255,.8)', 600);
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.fillRect(0, SCREEN_H - 12, SCREEN_W, 4);
  c.fillStyle = '#fff';
  c.fillRect(0, SCREEN_H - 12, SCREEN_W * 0.38, 4);
}

function reels(c: Ctx, img: Img) {
  photo(c, img, 0, 0, SCREEN_W, SCREEN_H, 0, 1.18, 0.35);
  shade(c, 0, 220, 0.45, 0);
  shade(c, 660, SCREEN_H, 0, 0.75);
  status(c, '#fff');
  text(c, 'Reels', 30, 124, 36, '#fff', 700);
  icon(c, 'camera', 438, 112, 34, '#fff');
  icon(c, 'heart', 434, 640, 42, '#fff');
  icon(c, 'bubble', 434, 730, 40, '#fff');
  icon(c, 'send', 434, 818, 38, '#fff');
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(434, 892 + i * 10, 3.5, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
  }
  avatar(c, 56, 932, 26, '#fff');
  const w = text(c, 'vikkaa.lk', 94, 941, 24, '#fff', 700);
  pill(c, 108 + w, 914, 96, 40, '', 'rgba(255,255,255,.85)');
  text(c, 'Follow', 156 + w, 941, 20, '#fff', 600, 'center');
  para(c, 'Every room, filmed in one visit.', 30, 1000, 360, 22, 'rgba(255,255,255,.92)');
  text(c, '♪  Original audio', 30, 1040, 19, 'rgba(255,255,255,.8)', 500);
}

function youtube(c: Ctx, img: Img) {
  c.fillStyle = '#0f0f0f';
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  status(c, '#fff');
  photo(c, img, 0, 84, SCREEN_W, 270);
  pill(c, 16, 312, 128, 30, 'rgba(0,0,0,.7)');
  text(c, '1:24 / 3:15', 80, 334, 17, '#fff', 600, 'center');
  c.fillStyle = 'rgba(255,255,255,.3)';
  c.fillRect(0, 351, SCREEN_W, 5);
  c.fillStyle = '#ee1c25';
  c.fillRect(0, 351, SCREEN_W * 0.43, 5);
  c.beginPath();
  c.arc(SCREEN_W * 0.43, 353.5, 9, 0, Math.PI * 2);
  c.fill();
  let y = para(c, 'Walkthrough film: a pool villa with a tropical garden in Ahangama', 24, 404, 430, 27, '#f1f1f1', 700);
  text(c, 'Vikkaa · Property film', 24, y + 2, 19, '#aaa', 500);
  y += 64;
  avatar(c, 50, y, 24);
  text(c, 'Vikkaa', 88, y + 8, 22, '#f1f1f1', 600);
  pill(c, 330, y - 22, 126, 44, '#f1f1f1');
  text(c, 'Subscribe', 393, y + 7, 19, '#0f0f0f', 700, 'center');
  y += 52;
  [
    ['thumb', 'Like', 108],
    ['share', 'Share', 116],
    ['bookmark', 'Save', 104],
  ].reduce((x, [name, label, w]) => {
    pill(c, x, y, w as number, 44, '#272727');
    icon(c, name as keyof typeof ICON, x + 28, y + 22, 22, '#f1f1f1');
    text(c, label as string, x + 46, y + 29, 18, '#f1f1f1', 600);
    return x + (w as number) + 10;
  }, 24);
  y += 76;
  for (let i = 0; i < 3; i++, y += 128) {
    photo(c, img, 24, y, 190, 107, 12, 1.4 + i * 0.35, [0.2, 0.8, 0.5][i]);
    c.fillStyle = '#3a3a3a';
    c.beginPath();
    c.roundRect(232, y + 8, 220, 16, 8);
    c.roundRect(232, y + 34, 160, 16, 8);
    c.fill();
    c.fillStyle = '#262626';
    c.beginPath();
    c.roundRect(232, y + 66, 120, 13, 6);
    c.fill();
  }
}

function facebook(c: Ctx, img: Img) {
  c.fillStyle = '#fff';
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  status(c, '#111');
  text(c, 'Feed', 26, 122, 34, '#111', 800);
  for (const [x, name] of [
    [362, 'search'],
    [426, 'menu'],
  ] as const) {
    c.beginPath();
    c.arc(x, 110, 24, 0, Math.PI * 2);
    c.fillStyle = '#e9ebee';
    c.fill();
    icon(c, name, x, 110, 24, '#111');
  }
  c.fillStyle = '#e4e6eb';
  c.fillRect(0, 154, SCREEN_W, 10);
  avatar(c, 52, 214, 28);
  text(c, 'Vikkaa', 94, 208, 23, '#111', 700);
  text(c, 'Sponsored', 94, 236, 18, '#65676b', 500);
  text(c, '···', 440, 216, 26, '#65676b', 700, 'center');
  para(c, 'Just listed in Ahangama: a pool villa, filmed by us room by room.', 24, 286, 430, 22, '#111');
  photo(c, img, 0, 350, SCREEN_W, 500, 0, 1.12, 0.6);
  c.fillStyle = '#f0f2f5';
  c.fillRect(0, 850, SCREEN_W, 100);
  text(c, 'VIKKAA.LK', 24, 886, 16, '#65676b', 600);
  text(c, 'Pool villa, Ahangama', 24, 920, 22, '#111', 700);
  pill(c, 332, 878, 128, 44, '#e4e6eb');
  text(c, 'Learn more', 396, 907, 18, '#111', 700, 'center');
  [
    ['thumb', 'Like', 80],
    ['bubble', 'Comment', 240],
    ['share', 'Share', 400],
  ].forEach(([name, label, x]) => {
    const cx = x as number;
    icon(c, name as keyof typeof ICON, cx - 34, 992, 24, '#65676b');
    text(c, label as string, cx - 16, 1000, 19, '#65676b', 600);
  });
}

function portal(c: Ctx, img: Img) {
  c.fillStyle = '#fbfbf9';
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  status(c, '#111');
  pill(c, 24, 86, 432, 58, '#eef0ee');
  icon(c, 'search', 58, 115, 24, '#4b6156');
  text(c, 'Villas in Ahangama', 84, 123, 21, '#4b6156', 500);
  [
    ['For sale', 106],
    ['Villa', 76],
    ['Pool', 74],
    ['Galle', 82],
  ].reduce((x, [label, w]) => {
    pill(c, x, 162, w as number, 40, '', 'rgba(11,40,30,.22)');
    text(c, label as string, x + (w as number) / 2, 188, 17, '#0b281e', 600, 'center');
    return x + (w as number) + 10;
  }, 24);
  photo(c, img, 24, 224, 432, 372, 26, 1.08, 0.45);
  pill(c, 42, 242, 128, 38, '#1d6649');
  c.save();
  c.translate(56, 251);
  c.scale(0.05, 0.05);
  c.fillStyle = '#fff';
  c.fill(path(TICK_PATH));
  c.restore();
  text(c, 'Verified', 82, 268, 17, '#fff', 700);
  c.beginPath();
  c.arc(418, 262, 22, 0, Math.PI * 2);
  c.fillStyle = '#fff';
  c.fill();
  icon(c, 'heart', 418, 263, 22, '#0b281e');
  text(c, 'Pool villa with a tropical garden', 24, 640, 26, '#0b281e', 700);
  icon(c, 'pin', 36, 674, 20, '#4b6156');
  text(c, 'Ahangama, Galle', 54, 681, 19, '#4b6156', 500);
  ['4 beds', '3 baths', 'Drone film'].reduce((x, label) => {
    const w = text(c, label, -999, -999, 17, '#0b281e', 600) + 30;
    pill(c, x, 704, w, 38, '#e8efea');
    text(c, label, x + w / 2, 729, 17, '#0b281e', 600, 'center');
    return x + w + 10;
  }, 24);
  c.fillStyle = 'rgba(11,40,30,.1)';
  c.fillRect(24, 768, 432, 2);
  avatar(c, 52, 818, 26);
  text(c, 'Listed by Vikkaa', 90, 826, 20, '#0b281e', 600);
  pill(c, 330, 794, 126, 48, '#0b281e');
  text(c, 'Enquire', 393, 825, 19, '#fff', 700, 'center');
  photo(c, img, 24, 876, 432, 300, 26, 1.6, 0.85);
}

export const DRAW = [tiktok, reels, youtube, facebook, portal] as const;

/** The small signal-red "LIVE" badge that pops onto each screen once it launches. */
export function drawLive(c: Ctx) {
  const { width: w, height: h } = c.canvas;
  c.clearRect(0, 0, w, h);
  pill(c, 0, 0, w, h, '#ee1c25');
  c.beginPath();
  c.arc(h * 0.55, h / 2, h * 0.14, 0, Math.PI * 2);
  c.fillStyle = '#fff';
  c.fill();
  c.font = `800 ${h * 0.44}px ${FONT}`;
  c.textAlign = 'left';
  c.fillText('L I V E', h * 0.9, h * 0.66);
}
