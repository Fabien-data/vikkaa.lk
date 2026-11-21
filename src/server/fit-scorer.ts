import { FIT_WEIGHTS } from '@/lib/rules';

export type IntakeAnswers = {
  timeline: '0-3m' | '3-6m' | '6m+' | 'testing';
  documents: 'clean' | 'minor' | 'dispute' | 'lease_owed';
  ownersAgree: boolean;
  exclusiveOk: boolean;
  inWesternProvince: boolean;
};

export type PriceRange = { lowCents: number; highCents: number };

export type FitFlag =
  | 'testing_market'
  | 'overpriced'
  | 'document_issue'
  | 'owners_disagree'
  | 'no_exclusivity'
  | 'outside_wp'
  | 'no_market_data';

export type FitResult = { score: number; flags: FitFlag[]; suggestNoGo: boolean };

export const RED_FLAGS: readonly FitFlag[] = [
  'testing_market',
  'overpriced',
  'document_issue',
  'owners_disagree',
  'no_exclusivity',
];

/** Advisory score (0–100) for a seller intake; a founder makes the final call. */
export function scoreFit(answers: IntakeAnswers, askingCents: number | null, range: PriceRange | null): FitResult {
  const w = FIT_WEIGHTS;
  const flags: FitFlag[] = [];
  let score = w.timeline[answers.timeline];
  if (answers.timeline === 'testing') flags.push('testing_market');

  if (askingCents == null || range == null) {
    score += w.price.unknown;
    flags.push('no_market_data');
  } else if (askingCents <= range.highCents * 1.1) {
    score += w.price.withinTen;
  } else if (askingCents <= range.highCents * 1.25) {
    score += w.price.withinTwentyFive;
  } else {
    flags.push('overpriced');
  }

  score += w.documents[answers.documents];
  if (answers.documents === 'dispute' || answers.documents === 'lease_owed') flags.push('document_issue');

  if (answers.ownersAgree) score += w.ownersAgree;
  else flags.push('owners_disagree');

  if (answers.exclusiveOk) score += w.exclusive;
  else flags.push('no_exclusivity');

  if (answers.inWesternProvince) score += w.westernProvince;
  else flags.push('outside_wp');

  return { score, flags, suggestNoGo: flags.some((f) => RED_FLAGS.includes(f)) };
}
