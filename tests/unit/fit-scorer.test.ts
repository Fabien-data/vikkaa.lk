import { describe, it, expect } from 'vitest';
import { scoreFit, type IntakeAnswers } from '@/server/fit-scorer';

const ideal: IntakeAnswers = {
  timeline: '0-3m',
  documents: 'clean',
  ownersAgree: true,
  exclusiveOk: true,
  inWesternProvince: true,
};
const range = { lowCents: 900_000_000, highCents: 1_000_000_000 };

describe('scoreFit', () => {
  it('ideal seller scores 100 with no flags', () => {
    expect(scoreFit(ideal, 1_000_000_000, range)).toEqual({ score: 100, flags: [], suggestNoGo: false });
  });

  it('more than 25% over market is red', () => {
    const r = scoreFit(ideal, 1_300_000_000, range);
    expect(r.flags).toContain('overpriced');
    expect(r.suggestNoGo).toBe(true);
    expect(r.score).toBe(75);
  });

  it('between 10% and 25% over market scores 10 for price without a flag', () => {
    const r = scoreFit(ideal, 1_200_000_000, range);
    expect(r.score).toBe(85);
    expect(r.flags).toEqual([]);
  });

  it('missing market data is neutral', () => {
    const r = scoreFit(ideal, 1_000_000_000, null);
    expect(r.score).toBe(87);
    expect(r.flags).toEqual(['no_market_data']);
    expect(r.suggestNoGo).toBe(false);
    expect(scoreFit(ideal, null, range).flags).toEqual(['no_market_data']);
  });

  it('flags testing the market, document issues, owner disagreement and no exclusivity as red', () => {
    const r = scoreFit(
      { timeline: 'testing', documents: 'lease_owed', ownersAgree: false, exclusiveOk: false, inWesternProvince: true },
      1_000_000_000,
      range,
    );
    expect(r.flags).toEqual(['testing_market', 'document_issue', 'owners_disagree', 'no_exclusivity']);
    expect(r.score).toBe(30);
    expect(r.suggestNoGo).toBe(true);
  });

  it('outside WP is not red', () => {
    const r = scoreFit({ ...ideal, inWesternProvince: false }, 1_000_000_000, range);
    expect(r.flags).toEqual(['outside_wp']);
    expect(r.score).toBe(95);
    expect(r.suggestNoGo).toBe(false);
  });

  it('scores middle timelines and minor document issues', () => {
    expect(scoreFit({ ...ideal, timeline: '3-6m', documents: 'minor' }, 1_000_000_000, range).score).toBe(80);
    expect(scoreFit({ ...ideal, timeline: '6m+' }, 1_000_000_000, range).score).toBe(85);
  });
});
