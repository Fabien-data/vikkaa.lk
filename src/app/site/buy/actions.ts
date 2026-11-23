'use server';
import { redirect } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';
import { normalisePhone } from '@/lib/phone';
import { ASSET_KINDS, type AssetKind } from '@/lib/enums';
import { formOptionalCents, formText, FormError, type ActionResult } from '@/lib/form';
import { upsertBuyerByPhone } from '@/server/buyers';
import { recordConsent } from '@/server/consent';
import { clientIp } from '../sell/actions';

export async function submitBrief(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  if (form.get('website')) redirect('/buy/thanks'); // honeypot
  if (!rateLimit(`buy:${await clientIp()}`, 5, 60_000)) return { error: 'Too many submissions, try again in a minute.' };

  const name = formText(form, 'name');
  const phone = normalisePhone(formText(form, 'phone'));
  if (!name) return { error: 'Enter your name.' };
  if (!phone) return { error: 'Enter a valid phone number.' };
  if (form.get('privacy') !== 'on') return { error: 'Please agree to the privacy notice so we can contact you.' };

  try {
    const now = new Date();
    await upsertBuyerByPhone(phone, {
      name,
      email: formText(form, 'email'),
      budgetMinCents: formOptionalCents(form, 'budgetMinRupees', 'Budget from'),
      budgetMaxCents: formOptionalCents(form, 'budgetMaxRupees', 'Budget up to'),
      areas: formText(form, 'areas'),
      kinds: form.getAll('kinds').map(String).filter((k): k is AssetKind => (ASSET_KINDS as readonly string[]).includes(k)),
      timeline: formText(form, 'timeline'),
      financing: formText(form, 'financing'),
      source: 'buyer_brief',
      privacyAcceptedAt: now,
    });
    if (form.get('circle') === 'on') await recordConsent({ contact: phone, purpose: 'circle', granted: true, source: 'buyer_brief', at: now });
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    throw err;
  }
  redirect('/buy/thanks');
}
