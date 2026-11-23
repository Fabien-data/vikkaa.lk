'use server';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { formText, type ActionResult } from '@/lib/form';
import { alertStaff, recordPitchView, requestCall } from '@/server/pitch';
import { clientIp } from '../../sell/actions';

/** Called by the page's beacon once JavaScript runs, so link-preview bots never count as a view. */
export async function recordView(token: string): Promise<void> {
  const ua = (await headers()).get('user-agent');
  const hit = await recordPitchView(token, { userAgent: ua });
  if (hit?.first) {
    const p = hit.prospect;
    after(() => alertStaff(p, `${p.name} just opened their pitch page`, `${p.name} opened the page you made for them. Call ${p.phone ?? 'them'} now, while it is fresh.`));
  }
}

export async function requestCallAction(token: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  if (form.get('website')) return { ok: true }; // honeypot
  if (!rateLimit(`pitch:${await clientIp()}`, 5, 60_000)) return { error: 'Too many requests. Try again in a minute.' };
  const p = await requestCall(token, { phone: formText(form, 'phone'), note: formText(form, 'note') });
  if (!p) return { error: 'This page is no longer available.' };
  after(() => alertStaff(p, `${p.name} asked for a call`, `${p.name} pressed "Request a call" on their pitch page.${formText(form, 'note') ? `\n\nNote: ${formText(form, 'note')}` : ''}`));
  return { ok: true };
}
