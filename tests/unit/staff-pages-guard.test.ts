import { it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Next 16 may skip re-rendering a layout during client navigation, so the (staff) layout's check is not a security
// boundary: every server-rendered Studio page must call requireStaff() itself.
function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name === 'page.tsx' ? [full] : [];
  });
}

it('every server-rendered Studio page calls requireStaff()', () => {
  const files = pages('src/app/console/studio/(staff)');
  expect(files.length).toBeGreaterThan(10);
  const unguarded = files.filter((f) => {
    const src = readFileSync(f, 'utf8');
    return !src.startsWith("'use client'") && !/await requireStaff\(\)/.test(src);
  });
  expect(unguarded).toEqual([]);
});
