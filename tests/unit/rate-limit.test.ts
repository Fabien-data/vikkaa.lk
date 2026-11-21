import { it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

it('allows 5 per window, refuses the 6th, then allows again after the window', () => {
  const t = 1_000_000;
  for (let i = 0; i < 5; i++) expect(rateLimit('k1', 5, 60_000, t + i)).toBe(true);
  expect(rateLimit('k1', 5, 60_000, t + 10)).toBe(false);
  expect(rateLimit('k1', 5, 60_000, t + 60_001)).toBe(true);
});

it('keeps keys separate', () => {
  for (let i = 0; i < 5; i++) rateLimit('k2', 5, 60_000, 1);
  expect(rateLimit('k3', 5, 60_000, 1)).toBe(true);
});
