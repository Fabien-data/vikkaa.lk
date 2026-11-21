import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import sharp from 'sharp';
import { config } from '@/lib/config';
import type { Photo } from '@/db/schema';

// shortcut: files live on the VPS disk; move to object storage when disk or traffic demands.
const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/;

function pathFor(area: 'public/media' | 'private', key: string): string {
  if (!SAFE_KEY.test(key) || key.split('/').includes('..')) throw new Error(`Unsafe storage key: ${key}`);
  const root = resolve(config.storageDir, area);
  const full = resolve(root, key);
  if (!full.startsWith(root + sep)) throw new Error(`Unsafe storage key: ${key}`);
  return full;
}

async function write(full: string, bytes: Buffer): Promise<void> {
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, bytes);
}

export const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Resizes an uploaded photo to 640px and 1600px WebP under public/media and returns the URLs. */
export async function putPublicImage(key: string, bytes: Buffer): Promise<Photo> {
  const sizes = [640, 1600] as const;
  for (const width of sizes) {
    const out = await sharp(bytes).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    await write(pathFor('public/media', `${key}-${width}.webp`), out);
  }
  const url = (w: number) => `/media/${key}-${w}.webp`;
  return { src: url(1600), srcSet: `${url(640)} 640w, ${url(1600)} 1600w` };
}

export async function putPrivate(key: string, bytes: Buffer): Promise<void> {
  await write(pathFor('private', key), bytes);
}

export async function readPrivate(key: string): Promise<Buffer> {
  return readFile(pathFor('private', key));
}

/** Absolute path of a public media file, for the dev-only /media route. */
export function publicMediaPath(key: string): string {
  return pathFor('public/media', key);
}

