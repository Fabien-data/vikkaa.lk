import { relations } from 'drizzle-orm';
import { pgTable, pgEnum, text, integer, bigint, boolean, jsonb, timestamp, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import {
  CLIENT_TYPES,
  ENGAGEMENT_TYPES,
  ENGAGEMENT_STAGES,
  ASSET_CATEGORIES,
  ASSET_KINDS,
  ASSET_STATUSES,
} from '@/lib/enums';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';

export const clientType = pgEnum('client_type', CLIENT_TYPES);
export const engagementType = pgEnum('engagement_type', ENGAGEMENT_TYPES);
export const engagementStage = pgEnum('engagement_stage', ENGAGEMENT_STAGES);
export const assetCategory = pgEnum('asset_category', ASSET_CATEGORIES);
export const assetKind = pgEnum('asset_kind', ASSET_KINDS);
export const assetStatus = pgEnum('asset_status', ASSET_STATUSES);
export const areaPriceKind = pgEnum('area_price_kind', ['land_perch', 'house', 'apartment', 'vehicle']);

const id = () => text().primaryKey().$defaultFn(() => crypto.randomUUID());
const money = () => bigint({ mode: 'number' });
// shortcut: every row belongs to the default organization; add real tenant scoping when the platform is sold.
const org = () =>
  text()
    .notNull()
    .default(DEFAULT_ORG_ID)
    .references(() => organization.id);
const timestamps = {
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export type Photo = { src: string; srcSet: string };

export const clients = pgTable(
  'clients',
  {
    id: id(),
    organizationId: org(),
    type: clientType().notNull(),
    name: text().notNull(),
    phone: text().notNull(),
    email: text(),
    notes: text(),
    ...timestamps,
  },
  (t) => [uniqueIndex('clients_org_phone_idx').on(t.organizationId, t.phone)],
);

export const engagements = pgTable('engagements', {
  id: id(),
  organizationId: org(),
  clientId: text()
    .notNull()
    .references(() => clients.id),
  type: engagementType().notNull(),
  stage: engagementStage().notNull().default('intake'),
  parentEngagementId: text(),
  intakeAnswers: jsonb().$type<Record<string, unknown>>(),
  fitScore: integer(),
  fitFlags: jsonb().$type<string[]>().notNull().default([]),
  upfrontFeeCents: money().notNull().default(0),
  adBudgetCents: money().notNull().default(0),
  commissionApplies: boolean().notNull().default(true),
  commissionRateBp: integer().notNull(),
  exclusiveDays: integer().notNull(),
  followOnMonths: integer().notNull(),
  contentPlan: text(),
  marketNotes: text(),
  noGoReason: text(),
  priceRead: text(),
  signedAt: timestamp(),
  endsAt: timestamp(),
  paidAt: timestamp(),
  ...timestamps,
});

export const assets = pgTable('assets', {
  id: id(),
  organizationId: org(),
  engagementId: text()
    .notNull()
    .references(() => engagements.id),
  category: assetCategory().notNull(),
  kind: assetKind().notNull(),
  status: assetStatus().notNull().default('draft'),
  title: text().notNull(),
  slug: text().notNull().unique(),
  description: text(),
  district: text().notNull(),
  area: text().notNull(),
  /** Private: never rendered publicly. */
  address: text(),
  askingPriceCents: money().notNull(),
  recommendedPriceCents: money(),
  details: jsonb().$type<Record<string, string | number>>().notNull().default({}),
  photos: jsonb().$type<Photo[]>().notNull().default([]),
  youtubeUrl: text(),
  publishedAt: timestamp(),
  soldAt: timestamp(),
  soldPriceCents: money(),
  ...timestamps,
});

export const areaPrices = pgTable('area_prices', {
  id: id(),
  organizationId: org(),
  kind: areaPriceKind().notNull(),
  district: text(),
  area: text(),
  make: text(),
  model: text(),
  year: integer(),
  lowCents: money().notNull(),
  highCents: money().notNull(),
  source: text().notNull(),
  ...timestamps,
});

export const comparables = pgTable('comparables', {
  id: id(),
  organizationId: org(),
  engagementId: text()
    .notNull()
    .references(() => engagements.id),
  assetId: text().references(() => assets.id),
  description: text().notNull(),
  priceCents: money().notNull(),
  source: text().notNull(),
  observedOn: date().notNull(),
  ...timestamps,
});

export const bookingType = pgEnum('booking_type', ['visit', 'shoot']);

export const bookings = pgTable('bookings', {
  id: id(),
  organizationId: org(),
  engagementId: text()
    .notNull()
    .references(() => engagements.id),
  assetId: text().references(() => assets.id),
  type: bookingType().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  durationMinutes: integer().notNull(),
  area: text().notNull(),
  notes: text(),
  ...timestamps,
});

/** What a note or task is about. subjectId points at that table's row (no FK: it spans four tables). */
export const subjectType = pgEnum('subject_type', ['client', 'engagement', 'asset', 'buyer']);

export const notes = pgTable(
  'notes',
  {
    id: id(),
    organizationId: org(),
    subjectType: subjectType().notNull(),
    subjectId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id),
    body: text().notNull(),
    ...timestamps,
  },
  (t) => [index('notes_subject_idx').on(t.subjectType, t.subjectId)],
);

export const tasks = pgTable(
  'tasks',
  {
    id: id(),
    organizationId: org(),
    subjectType: subjectType().notNull(),
    subjectId: text().notNull(),
    title: text().notNull(),
    dueAt: timestamp({ withTimezone: true }),
    assignedUserId: text().references(() => user.id),
    doneAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('tasks_subject_idx').on(t.subjectType, t.subjectId)],
);

export const clientsRelations = relations(clients, ({ many }) => ({ engagements: many(engagements) }));
export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  client: one(clients, { fields: [engagements.clientId], references: [clients.id] }),
  assets: many(assets),
  comparables: many(comparables),
}));
export const assetsRelations = relations(assets, ({ one }) => ({
  engagement: one(engagements, { fields: [assets.engagementId], references: [engagements.id] }),
}));
export const comparablesRelations = relations(comparables, ({ one }) => ({
  engagement: one(engagements, { fields: [comparables.engagementId], references: [engagements.id] }),
}));

export type Client = typeof clients.$inferSelect;
export type Engagement = typeof engagements.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type AreaPrice = typeof areaPrices.$inferSelect;
export type Comparable = typeof comparables.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type SubjectType = (typeof subjectType.enumValues)[number];
