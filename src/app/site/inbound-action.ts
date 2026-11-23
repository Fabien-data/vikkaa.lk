'use server';
import { after } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { normalisePhone } from '@/lib/phone';
import { formText, type ActionResult } from '@/lib/form';
import { alertStaff, recordInbound } from '@/server/pitch';
import { clientIp } from './sell/actions';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** The /dealers and /developers forms. New businesses join the prospect list; known ones get a call task. */
export async function submitInbound(segment: 'dealer' | 'developer', _prev: ActionResult, form: FormData): Promise<ActionResult> {
  if (form.get('website')) return { ok: true }; // honeypot
  if (!rateLimit(`inbound:${await clientIp()}`, 5, 60_000)) return { error: 'Too many submissions, try again in a minute.' };
  const name = formText(form, 'name');
  const phone = normalisePhone(formText(form, 'phone'));
  if (!name) return { error: segment === 'dealer' ? 'Enter your dealership name.' : 'Enter your company or project name.' };
  if (!phone) return { error: 'Enter a valid phone number.' };
  const email = formText(form, 'email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address, or leave it empty.' };
  if (form.get('privacy') !== 'on') return { error: 'Please agree to the privacy notice so we can contact you.' };
  const utm = Object.fromEntries(UTM_KEYS.flatMap((k) => (formText(form, k) ? [[k, formText(form, k)!.slice(0, 120)]] : [])));

  const p = await recordInbound({
    segment,
    name,
    contactName: formText(form, 'contactName'),
    phone,
    email,
    area: formText(form, 'area'),
    note: formText(form, 'note'),
    utm,
    updatesConsent: form.get('updates') === 'on',
  });
  after(() => alertStaff(p, `New ${segment} enquiry: ${name}`, `${name} (${phone}) filled in the /${segment}s form.${formText(form, 'note') ? `\n\n${formText(form, 'note')}` : ''}`));
  return { ok: true };
}
