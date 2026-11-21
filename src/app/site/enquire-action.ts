'use server';
import { notFound } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';
import { normalisePhone } from '@/lib/phone';
import { formText, type ActionResult } from '@/lib/form';
import { findPublicAssetIdBySlug } from '@/server/public-assets';
import { recordEnquiry } from '@/server/enquiry-intake';
import { clientIp } from './sell/actions';

export async function submitEnquiry(slug: string, _prev: ActionResult, form: FormData): Promise<ActionResult> {
  if (form.get('website')) return { ok: true }; // honeypot
  const asset = await findPublicAssetIdBySlug(slug);
  if (!asset) notFound();
  if (!rateLimit(`enq:${await clientIp()}`, 5, 60_000)) return { error: 'Too many messages, try again in a minute.' };

  const name = formText(form, 'name');
  const phone = normalisePhone(formText(form, 'phone'));
  if (!name) return { error: 'Enter your name.' };
  if (!phone) return { error: 'Enter a valid phone number.' };
  if (form.get('privacy') !== 'on') return { error: 'Please agree to the privacy notice so we can contact you.' };

  await recordEnquiry(asset.id, {
    name,
    phone,
    email: formText(form, 'email') ?? undefined,
    message: formText(form, 'message') ?? undefined,
    circle: form.get('circle') === 'on',
  });
  return { ok: true };
}
