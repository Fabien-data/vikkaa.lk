// Turns the founders' brand files (opaque PNGs) into web-ready assets under public/brand and src/app.
// Rerun after the brand files change: pnpm exec tsx scripts/build-brand-assets.ts
import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'Vikkaa Assests/Vikka';
const file = (n: number) => `${SRC}/Vikka [Recovered]-0${n}.png`;
const OUT = 'public/brand';

/** "Colour to alpha" against white: white → transparent, the artwork keeps its colours and soft edges. */
async function whiteToAlpha(input: string, width: number, tint?: [number, number, number]) {
  const { data, info } = await sharp(input).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const a = Math.max(255 - r, 255 - g, 255 - b) / 255;
    if (a < 0.02) continue;
    const un = (c: number) => Math.round(Math.min(255, Math.max(0, (c - 255 * (1 - a)) / a)));
    [out[j], out[j + 1], out[j + 2]] = tint ?? [un(r), un(g), un(b)];
    out[j + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().png();
}

async function alphaAt(path: string, x: number, y: number) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * 4 + 3];
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Wordmark (file 04: green on white) and tick (file 05).
await (await whiteToAlpha(file(4), 1400)).toFile(`${OUT}/logo.png`);
await (await whiteToAlpha(file(4), 1400, [255, 255, 255])).toFile(`${OUT}/logo-white.png`);
await (await whiteToAlpha(file(5), 800)).toFile(`${OUT}/mark.png`);

// App icon (file 06): trim the white margin, then round the corners so they are transparent.
const icon = await sharp(file(6)).trim({ threshold: 20 }).resize(1024, 1024).png().toBuffer();
const mask = Buffer.from('<svg width="1024" height="1024"><rect width="1024" height="1024" rx="215" fill="#fff"/></svg>');
const rounded = await sharp(icon).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
for (const [size, path] of [
  [512, `${OUT}/icon-512.png`],
  [192, `${OUT}/icon-192.png`],
  [512, 'src/app/icon.png'],
] as const) {
  await sharp(rounded).resize(size, size).png().toFile(path);
}
await sharp(icon).resize(180, 180).png().toFile('src/app/apple-icon.png'); // iOS rounds the corners itself

// Link-preview image (1200×630) from file 03: white wordmark on the brand gradient.
await sharp(file(3)).resize({ width: 1200 }).extract({ left: 0, top: 435, width: 1200, height: 630 }).jpeg({ quality: 85 }).toFile(`${OUT}/og.jpg`);

// Self-checks: transparent backgrounds, opaque artwork, rounded icon corners.
const logo = await sharp(`${OUT}/logo.png`).metadata();
assert.equal(logo.hasAlpha, true);
assert.ok(logo.width! > logo.height!, 'wordmark should be wider than tall');
assert.equal(await alphaAt(`${OUT}/icon-512.png`, 2, 2), 0, 'icon corner should be transparent');
assert.ok((await alphaAt(`${OUT}/icon-512.png`, 256, 40)) > 250, 'icon body should be opaque');
console.log('Brand assets written to public/brand and src/app');
