import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '@/lib/config';

const sign = (path: string, exp: number) => createHmac('sha256', config.appSecret).update(`${path}|${exp}`).digest('hex');

/** "/sign/abc" → "/sign/abc?exp=…&sig=…", valid for ttlSeconds. */
export function signPath(path: string, ttlSeconds: number, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${path}?exp=${exp}&sig=${sign(path, exp)}`;
}

export function verifySignedPath(path: string, params: URLSearchParams, now = Date.now()): 'ok' | 'expired' | 'invalid' {
  const exp = Number(params.get('exp'));
  const sig = params.get('sig') ?? '';
  if (!Number.isInteger(exp) || !/^[a-f0-9]{64}$/.test(sig)) return 'invalid';
  const expected = Buffer.from(sign(path, exp), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(sig, 'hex'))) return 'invalid';
  return exp * 1000 < now ? 'expired' : 'ok';
}
