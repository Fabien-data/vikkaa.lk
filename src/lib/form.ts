import { rupeesToCents } from '@/lib/money';

export type ActionResult = { ok?: true; error?: string; warning?: string } | undefined;

/** A user-facing validation problem in a Studio form. */
export class FormError extends Error {}

/** Studio datetime-local inputs are Sri Lanka time (UTC+05:30); the server runs in UTC. Empty means now. */
export function sriLankaTime(value: string | null): Date {
  if (!value) return new Date();
  const d = new Date(`${value}:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new FormError('Enter a valid date and time');
  return d;
}

export function formText(form: FormData, name: string): string | null {
  const v = String(form.get(name) ?? '').trim();
  return v || null;
}

export function formCents(form: FormData, name: string, label: string): number {
  const raw = String(form.get(name) ?? '').trim();
  if (raw === '') return 0;
  try {
    return rupeesToCents(raw);
  } catch {
    throw new FormError(`${label}: enter an amount in rupees`);
  }
}

export function formOptionalCents(form: FormData, name: string, label: string): number | null {
  return String(form.get(name) ?? '').trim() === '' ? null : formCents(form, name, label);
}

export function formInt(form: FormData, name: string, label: string, min: number, max: number): number {
  const n = Number(String(form.get(name) ?? '').trim());
  if (!Number.isInteger(n) || n < min || n > max) throw new FormError(`${label}: enter a whole number from ${min} to ${max}`);
  return n;
}
