import { pgTable, pgEnum, text, integer, boolean, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';

export const CHANNEL_STATUSES = ['not_set', 'handle_saved', 'connected', 'api_approved', 'rejected'] as const;
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number];
export const channelStatus = pgEnum('channel_status', CHANNEL_STATUSES);

/** One row per organisation; the shape lives in src/server/settings.ts (zod, with defaults). */
export const orgSettings = pgTable('org_settings', {
  organizationId: text()
    .primaryKey()
    .default(DEFAULT_ORG_ID)
    .references(() => organization.id),
  data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedByUserId: text().references(() => user.id),
});

/** Every social, listing, messaging and infrastructure account. Handles first; API credentials come later. */
export const channelConnections = pgTable(
  'channel_connections',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text()
      .notNull()
      .default(DEFAULT_ORG_ID)
      .references(() => organization.id),
    key: text().notNull(),
    handle: text(),
    url: text(),
    externalId: text(),
    status: channelStatus().notNull().default('not_set'),
    ownerUserId: text().references(() => user.id),
    showInFooter: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    notes: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('channel_connections_org_key_idx').on(t.organizationId, t.key)],
);

export type ChannelConnection = typeof channelConnections.$inferSelect;
