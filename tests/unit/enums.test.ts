import { it, expect } from 'vitest';
import { kindCategory, nextStage, isPublicStatus, stageLabel, statusLabel } from '@/lib/enums';
import { whatsappLink } from '@/lib/whatsapp';

it('maps kinds to categories', () => {
  expect(kindCategory('suv')).toBe('vehicle');
  expect(kindCategory('car')).toBe('vehicle');
  expect(kindCategory('van')).toBe('vehicle');
  expect(kindCategory('land')).toBe('property');
  expect(kindCategory('other')).toBe('property');
});
it('advances early stages only', () => {
  expect(nextStage('intake')).toBe('call');
  expect(nextStage('visit')).toBe('proposal');
  expect(nextStage('proposal')).toBeNull();
  expect(nextStage('signed')).toBeNull();
});
it('knows which statuses are public', () => {
  expect(isPublicStatus('live')).toBe(true);
  expect(isPublicStatus('under_offer')).toBe(true);
  expect(isPublicStatus('sold')).toBe(true);
  expect(isPublicStatus('draft')).toBe(false);
  expect(isPublicStatus('production')).toBe(false);
});
it('labels in plain English', () => {
  expect(stageLabel('no_go')).toBe('Not going ahead');
  expect(statusLabel('under_offer')).toBe('Under offer');
});
it('builds a wa.me link', () =>
  expect(whatsappLink('+94771234567', 'Hi there')).toBe('https://wa.me/94771234567?text=Hi%20there'));
