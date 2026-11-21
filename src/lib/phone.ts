/** Normalise a phone number typed in any common Sri Lankan or international format to E.164, or null. */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+940')) s = `+94${s.slice(4)}`; // people often keep the trunk 0: +94 077 …
  if (/^0\d{9}$/.test(s)) return `+94${s.slice(1)}`;
  if (/^94\d{9}$/.test(s)) return `+${s}`;
  if (s.startsWith('+94')) return /^\+94\d{9}$/.test(s) ? s : null; // Sri Lankan numbers are exactly 9 digits
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}
