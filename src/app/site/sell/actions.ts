'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rateLimit } from '@/lib/rate-limit';
import { sellerIntakeSchema, submitSellerIntake } from '@/server/seller-intake';

export type SellState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'unknown';
}

export async function submitSell(_prev: SellState, form: FormData): Promise<SellState> {
  if (form.get('website')) redirect('/sell/thanks'); // honeypot: pretend success, save nothing

  if (!rateLimit(`sell:${await clientIp()}`, 5, 60_000)) {
    return { error: 'Too many submissions, try again in a minute.' };
  }

  const parsed = sellerIntakeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fieldErrors[String(issue.path[0])] ??= []).push(issue.message);
    return { error: 'Please fix the highlighted fields.', fieldErrors };
  }

  await submitSellerIntake(parsed.data);
  redirect('/sell/thanks');
}
