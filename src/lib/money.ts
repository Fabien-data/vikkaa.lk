const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 125000000 → "Rs 1,250,000"; 125050 → "Rs 1,250.50". */
export function formatLkr(cents: number): string {
  const rupees = cents / 100;
  return `Rs ${cents % 100 === 0 ? grouped.format(rupees) : withCents.format(rupees)}`;
}

/** "75,000" → 7500000. Throws RangeError for empty, non-numeric or negative input. */
export function rupeesToCents(input: string | number): number {
  const value = typeof input === 'number' ? input : Number(input.replace(/,/g, '').trim() || NaN);
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Not a valid rupee amount: ${input}`);
  return Math.round(value * 100);
}
