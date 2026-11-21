import { it, expect } from 'vitest';
import { signPath, verifySignedPath } from '@/lib/signed-url';

const now = 1_800_000_000_000;
const params = (url: string) => new URL(url, 'http://x').searchParams;

it('verifies a fresh link', () => {
  const url = signPath('/sign/abc', 3600, now);
  expect(url).toMatch(/^\/sign\/abc\?exp=\d+&sig=[a-f0-9]{64}$/);
  expect(verifySignedPath('/sign/abc', params(url), now + 1000)).toBe('ok');
});

it('expires', () => {
  const url = signPath('/sign/abc', 60, now);
  expect(verifySignedPath('/sign/abc', params(url), now + 61_000)).toBe('expired');
});

it('rejects tampering with path, expiry or signature', () => {
  const url = signPath('/sign/abc', 3600, now);
  expect(verifySignedPath('/sign/xyz', params(url), now)).toBe('invalid');
  const p = params(url);
  p.set('exp', String(Number(p.get('exp')) + 999));
  expect(verifySignedPath('/sign/abc', p, now)).toBe('invalid');
  const q = params(url);
  q.set('sig', 'f'.repeat(64));
  expect(verifySignedPath('/sign/abc', q, now)).toBe('invalid');
  expect(verifySignedPath('/sign/abc', new URLSearchParams(), now)).toBe('invalid');
});
