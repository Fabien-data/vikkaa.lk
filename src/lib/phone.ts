/** Normalise a phone number typed in any common Sri Lankan or international format to E.164, or null. */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (/^0\d{9}$/.test(s)) return `+94${s.slice(1)}`;
  if (/^94\d{9}$/.test(s)) return `+${s}`;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}
