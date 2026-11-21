import { it, expect, vi, afterEach } from 'vitest';
import { config } from '@/lib/config';
import { sendSms } from '@/server/sms';

afterEach(() => {
  vi.unstubAllGlobals();
  config.notifyLk.apiKey = '';
});

it('posts to Notify.lk with a digits-only recipient', async () => {
  Object.assign(config.notifyLk, { userId: 'u1', apiKey: 'k1', senderId: 'Vikkaa' });
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'success' }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  await sendSms('+94771234567', 'Hello');
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://app.notify.lk/api/v1/send');
  expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
    user_id: 'u1',
    api_key: 'k1',
    sender_id: 'Vikkaa',
    to: '94771234567',
    message: 'Hello',
  });
});

it('throws when Notify.lk reports a failure', async () => {
  Object.assign(config.notifyLk, { userId: 'u1', apiKey: 'k1', senderId: 'Vikkaa' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'error' }), { status: 200 })));
  await expect(sendSms('+94771234567', 'x')).rejects.toThrow(/Notify.lk/);
});
