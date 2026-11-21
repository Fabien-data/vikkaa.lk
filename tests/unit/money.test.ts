import { it, expect } from 'vitest';
import { formatLkr, rupeesToCents } from '@/lib/money';

it('formats whole rupees without decimals', () => expect(formatLkr(125000000)).toBe('Rs 1,250,000'));
it('formats cents with two decimals', () => expect(formatLkr(125050)).toBe('Rs 1,250.50'));
it('formats zero', () => expect(formatLkr(0)).toBe('Rs 0'));
it('parses rupees with commas', () => expect(rupeesToCents('75,000')).toBe(7500000));
it('parses decimals and numbers', () => {
  expect(rupeesToCents('1250.5')).toBe(125050);
  expect(rupeesToCents(68500000)).toBe(6850000000);
});
it('rejects negative and non-numeric input', () => {
  expect(() => rupeesToCents('-5')).toThrow(RangeError);
  expect(() => rupeesToCents('abc')).toThrow(RangeError);
  expect(() => rupeesToCents('')).toThrow(RangeError);
});
