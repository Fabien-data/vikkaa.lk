export const DEFAULT_ORG_ID = 'org_vikkaa';

export const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale',
  'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
] as const;

export const WESTERN_PROVINCE: readonly string[] = ['Colombo', 'Gampaha', 'Kalutara'];

export const DEFAULT_EXCLUSIVE_DAYS = 90;
export const DEFAULT_FOLLOW_ON_MONTHS = 6;
export const COMMISSION_BP = { property: 300, vehicle: 150 } as const;

/** Fit-score weights (Claude's defaults; founders can retune). Max total = 100. */
export const FIT_WEIGHTS = {
  timeline: { '0-3m': 20, '3-6m': 10, '6m+': 5, testing: 0 },
  price: { withinTen: 25, withinTwentyFive: 10, unknown: 12 },
  documents: { clean: 20, minor: 10, dispute: 0, lease_owed: 0 },
  ownersAgree: 15,
  exclusive: 15,
  westernProvince: 5,
} as const;
