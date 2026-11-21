import { it, expect } from 'vitest';
import { isValidIdNumber } from '@/lib/id-number';

it.each(['123456789V', '987654321x', '200012345678', 'N1234567'])('accepts %s', (s) => expect(isValidIdNumber(s)).toBe(true));
it.each(['1234', '12345678901', '', 'AB-12345'])('rejects %s', (s) => expect(isValidIdNumber(s)).toBe(false));
