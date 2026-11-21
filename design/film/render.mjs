// Frame-accurate renderer: headless Chrome (DevTools protocol over Node's built-in WebSocket) -> ffmpeg.
// node render.mjs --format landscape|vertical [--stills 1,5.5,9.8] [--from 0 --to 29.5]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FORMAT = arg('format', 'landscape');
const [W, H] = FORMAT === 'vertical' ? [1080, 1920] : [1920, 1080];
const FPS = 30;
const STILLS = arg('stills');
const ROOT = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const WORK = path.join(ROOT, 'work');
mkdirSync(WORK, { recursive: true });
const CHROME = process.env.CHROME || `${process.env.USERPROFILE}\\.cache\\puppeteer\\chrome\\win64-150.0.7871.24\\chrome-win64\\chrome.exe`;
const PORT = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--hide-scrollbars', '--mute-audio',
  '--force-device-scale-factor=1', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--user-data-dir=${path.join(WORK, `chrome-${FORMAT}`)}`, 'about:blank',
], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
  if (!wsUrl) await sleep(250);
}
if (!wsUrl) throw new Error('Chrome did not start');
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
  if (m.method === 'Runtime.exceptionThrown') console.error('PAGE ERROR', JSON.stringify(m.params.exceptionDetails).slice(0, 600));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('PAGE console.error', JSON.stringify(m.params.args).slice(0, 400));
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const url = `${pathToFileURL(path.join(ROOT, 'composition', 'index.html')).href}?format=${FORMAT}`;
await send('Page.navigate', { url });
for (let i = 0; i < 240; i++) {
  const ok = await evaluate('typeof window.__ready !== "undefined" ? window.__ready.then(() => true) : false').catch(() => false);
  if (ok) break;
  await sleep(250);
}
const DUR = await evaluate('window.__DUR');
writeFileSync(path.join(WORK, `cues.json`), JSON.stringify(await evaluate('window.__cues'), null, 1));

const shot = async (t) => {
  await evaluate(`window.__seek(${t})`);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  return Buffer.from(data, 'base64');
};

if (STILLS) {
  const dir = path.join(WORK, `stills-${FORMAT}`);
  mkdirSync(dir, { recursive: true });
  for (const t of STILLS.split(',').map(Number)) {
    writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.jpg`), await shot(t));
    console.log('still', t);
  }
} else {
  const from = +arg('from', 0), to = +arg('to', DUR);
  const out = path.join(WORK, `video-${FORMAT}.mp4`);
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round((to - from) * FPS);
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    const buf = await shot(from + f / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', out, frames, 'frames');
}
ws.close();
chrome.kill();
