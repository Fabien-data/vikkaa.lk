import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';

const COOKIE = 'vk_portal';
const TTL_SECONDS = 7 * 86_400;

const mac = (payload: string) => createHmac('sha256', config.appSecret).update(`portal|${payload}`).digest('hex');

export async function startPortalSession(clientId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${clientId}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${mac(payload)}`, {
    httpOnly: true,
    secure: config.production,
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function getPortalClientId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  const parts = value?.split('.') ?? [];
  if (parts.length !== 3) return null;
  const [clientId, exp, sig] = parts;
  const expected = Buffer.from(mac(`${clientId}.${exp}`), 'hex');
  const given = Buffer.from(sig, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Number(exp) * 1000 > Date.now() ? clientId : null;
}

export async function endPortalSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
