/** Sri Lankan NIC (old 9 digits + V/X, or new 12 digits) or a passport number. */
export function isValidIdNumber(s: string): boolean {
  const v = s.trim();
  return /^\d{9}[VvXx]$/.test(v) || /^\d{12}$/.test(v) || (/^[A-Za-z0-9]{6,12}$/.test(v) && /[A-Za-z]/.test(v));
}
