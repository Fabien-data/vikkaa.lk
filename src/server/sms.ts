import { config } from '@/lib/config';

/** Sends an SMS through Notify.lk (Sri Lankan numbers only). Logs instead when unconfigured outside production. */
export async function sendSms(e164: string, message: string): Promise<void> {
  const { userId, apiKey, senderId } = config.notifyLk;
  if (!apiKey) {
    if (config.production) throw new Error('NOTIFY_LK_API_KEY is not set');
    console.info(`[sms:dev] to=${e164} ${message}`);
    return;
  }
  const res = await fetch('https://app.notify.lk/api/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ user_id: userId, api_key: apiKey, sender_id: senderId, to: e164.replace(/^\+/, ''), message }).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string };
  if (!res.ok || body.status !== 'success') throw new Error(`Notify.lk SMS failed (HTTP ${res.status}, status ${body.status ?? 'unknown'})`);
}
