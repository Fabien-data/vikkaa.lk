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
