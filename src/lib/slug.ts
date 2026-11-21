import { randomBytes } from 'node:crypto';

/** "4-bed house, Nugegoda" → "4-bed-house-nugegoda-x7k2p9" (random suffix keeps slugs unique). */
export function slugFor(title: string): string {
  const suffix = Array.from(randomBytes(6), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${suffix}`;
}
