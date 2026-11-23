import { sql } from 'drizzle-orm';
import { pgTable, pgEnum, text, bigint, date, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';
import { assets, engagements } from './core';
import { buyers } from './evidence';

const id = () => text().primaryKey().$defaultFn(() => crypto.randomUUID());
const money = () => bigint({ mode: 'number' });
const org = () =>
  text()
    .notNull()
    .default(DEFAULT_ORG_ID)
    .references(() => organization.id);

export const DEAL_STATUSES = ['agreed', 'completed', 'fell_through'] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];
export const dealStatus = pgEnum('deal_status', DEAL_STATUSES);

/** An agreed sale. The commission is worked out from the engagement's signed terms when the deal is agreed. */
export const deals = pgTable(
  'deals',
  {
    id: id(),
    organizationId: org(),
    assetId: text()
      .notNull()
      .references(() => assets.id),
    /** Null when the seller found the buyer themselves (commission can still be due under the exclusive). */
    buyerId: text().references(() => buyers.id),
    agreedPriceCents: money().notNull(),
    agreedAt: timestamp({ withTimezone: true }).notNull(),
    completionDueOn: date(),
    advanceCents: money().notNull().default(0),
    notary: text(),
    status: dealStatus().notNull().default('agreed'),
    completedAt: timestamp({ withTimezone: true }),
    fellThroughAt: timestamp({ withTimezone: true }),
    fellThroughReason: text(),
    /** exclusive, follow_on, introduced or none: why commission is (or is not) due. */
    basis: text().notNull(),
    notes: text(),
    createdByUserId: text().references(() => user.id),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  // One open (agreed) sale per asset, even if two people record it at the same moment.
  (t) => [index('deals_asset_idx').on(t.assetId), uniqueIndex('deals_one_open_per_asset_idx').on(t.assetId).where(sql`${t.status} = 'agreed'`)],
);

export const AD_LEDGER_KINDS = ['spend', 'refund'] as const;
export type AdLedgerKind = (typeof AD_LEDGER_KINDS)[number];
export const adLedgerKind = pgEnum('ad_ledger_kind', AD_LEDGER_KINDS);

/** What happened to the client's ad deposit: spend per channel and any refund. Deposits themselves are receipts. */
export const adLedger = pgTable(
  'ad_ledger',
  {
    id: id(),
    organizationId: org(),
    engagementId: text()
      .notNull()
      .references(() => engagements.id),
    assetId: text().references(() => assets.id),
    kind: adLedgerKind().notNull(),
    amountCents: money().notNull(),
    channel: text(),
    occurredOn: date().notNull(),
    reference: text(),
    note: text(),
    recordedByUserId: text().references(() => user.id),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index('ad_ledger_engagement_idx').on(t.engagementId)],
);

export type Deal = typeof deals.$inferSelect;
export type AdLedgerEntry = typeof adLedger.$inferSelect;
