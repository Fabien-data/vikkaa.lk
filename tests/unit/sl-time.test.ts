import { describe, it, expect } from 'vitest';
import { daysUntil, sriLankaDay, sriLankaHour, sriLankaWeekStart, sriLankaYear } from '@/lib/sl-time';

describe('Sri Lanka time', () => {
  it('days and hours follow UTC+05:30', () => {
    const t = new Date('2026-12-31T19:00:00Z'); // 00:30 on 1 Jan in Colombo
    expect(sriLankaDay(t)).toBe('2027-01-01');
    expect(sriLankaYear(t)).toBe(2027);
    expect(sriLankaHour(new Date('2026-11-23T03:30:00Z'))).toBe(9);
  });

  it('weeks start on Monday midnight in Colombo', () => {
    // Sunday 29 Nov 2026, 23:00 in Colombo
    expect(sriLankaWeekStart(new Date('2026-11-29T17:30:00Z')).toISOString()).toBe('2026-11-22T18:30:00.000Z');
    // Monday 30 Nov 2026, 00:10 in Colombo
    expect(sriLankaWeekStart(new Date('2026-11-29T18:40:00Z')).toISOString()).toBe('2026-11-29T18:30:00.000Z');
  });

  it('counts whole days to a date', () => {
    const now = new Date('2026-11-22T20:00:00Z'); // 23 Nov in Colombo
    expect(daysUntil('2026-12-20', now)).toBe(27);
    expect(daysUntil('2026-11-23', now)).toBe(0);
    expect(daysUntil('2026-11-20', now)).toBe(-3);
  });
});
