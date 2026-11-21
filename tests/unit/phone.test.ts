import { it, expect } from 'vitest';
import { normalisePhone } from '@/lib/phone';

it.each([
  ['0771234567', '+94771234567'],
  ['077 123 4567', '+94771234567'],
  ['94771234567', '+94771234567'],
  ['+94 77-123-4567', '+94771234567'],
  ['0112345678', '+94112345678'],
  ['+447911123456', '+447911123456'],
  ['00447911123456', '+447911123456'],
  ['(077) 123.4567', '+94771234567'],
  ['12345', null],
  ['', null],
  [null, null],
  [undefined, null],
  ['abc', null],
  ['+12', null],
])('normalisePhone(%s) → %s', (raw, out) => expect(normalisePhone(raw)).toBe(out));
