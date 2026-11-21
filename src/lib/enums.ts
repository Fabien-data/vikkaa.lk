export const CLIENT_TYPES = ['private', 'dealer', 'developer', 'agent', 'overseas'] as const;
export const ENGAGEMENT_TYPES = ['single', 'batch', 'project', 'retainer'] as const;
export const ENGAGEMENT_STAGES = ['intake', 'call', 'visit', 'proposal', 'signed', 'no_go', 'closed'] as const;
export const ASSET_CATEGORIES = ['property', 'vehicle'] as const;
export const ASSET_KINDS = ['house', 'apartment', 'land', 'commercial', 'car', 'suv', 'van', 'other'] as const;
export const ASSET_STATUSES = ['draft', 'production', 'live', 'under_offer', 'sold', 'expired', 'withdrawn'] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];
export type EngagementStage = (typeof ENGAGEMENT_STAGES)[number];
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export type AssetKind = (typeof ASSET_KINDS)[number];
export type AssetStatus = (typeof ASSET_STATUSES)[number];

const EARLY_STAGES: EngagementStage[] = ['intake', 'call', 'visit', 'proposal'];
const VEHICLE_KINDS: AssetKind[] = ['car', 'suv', 'van'];

export function nextStage(stage: EngagementStage): EngagementStage | null {
  const i = EARLY_STAGES.indexOf(stage);
  return i >= 0 && i < EARLY_STAGES.length - 1 ? EARLY_STAGES[i + 1] : null;
}

export function kindCategory(kind: AssetKind): AssetCategory {
  return VEHICLE_KINDS.includes(kind) ? 'vehicle' : 'property';
}

export function isPublicStatus(status: AssetStatus): boolean {
  return status === 'live' || status === 'under_offer' || status === 'sold';
}

const STAGE_LABELS: Record<EngagementStage, string> = {
  intake: 'Received',
  call: 'Discovery call',
  visit: 'Site visit',
  proposal: 'Proposal sent',
  signed: 'Agreement signed',
  no_go: 'Not going ahead',
  closed: 'Closed',
};

const STATUS_LABELS: Record<AssetStatus, string> = {
  draft: 'Preparing',
  production: 'Being filmed and edited',
  live: 'Live',
  under_offer: 'Under offer',
  sold: 'Sold',
  expired: 'Agreement ended',
  withdrawn: 'Withdrawn',
};

export const stageLabel = (stage: EngagementStage) => STAGE_LABELS[stage];
export const statusLabel = (status: AssetStatus) => STATUS_LABELS[status];
