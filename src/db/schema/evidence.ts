import { relations } from 'drizzle-orm';
import { pgTable, pgEnum, text, bigint, bigserial, jsonb, timestamp, uniqueIndex, char } from 'drizzle-orm/pg-core';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';
import { assets } from './core';

export const EVIDENCE_TYPES = ['first_contact', 'contact', 'viewing', 'test_drive', 'offer', 'correction'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export const CHANNELS = ['web_form', 'whatsapp', 'phone', 'in_person', 'email'] as const;
export type Channel = (typeof CHANNELS)[number];

export const evidenceType = pgEnum('evidence_type', EVIDENCE_TYPES);
export const contactChannel = pgEnum('contact_channel', CHANNELS);

const org = () =>
  text()
    .notNull()
    .default(DEFAULT_ORG_ID)
    .references(() => organization.id);

/** Buyer personal data lives here (never in evidence entries) so it can be anonymised without breaking the chain. */
export const buyers = pgTable(
  'buyers',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: org(),
    name: text(),
    phone: text().notNull(),
    email: text(),
    nic: text(),
    budgetMinCents: bigint({ mode: 'number' }),
    budgetMaxCents: bigint({ mode: 'number' }),
    areas: text(),
    kinds: jsonb().$type<string[]>(),
    timeline: text(),
    financing: text(),
    source: text(),
    privacyAcceptedAt: timestamp({ withTimezone: true }),
    circleConsentAt: timestamp({ withTimezone: true }),
    circleWithdrawnAt: timestamp({ withTimezone: true }),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('buyers_org_phone_idx').on(t.organizationId, t.phone)],
);

/** Append-only (a database trigger blocks UPDATE/DELETE) and hash-chained per organization, in `seq` order. */
export const evidenceEntries = pgTable('evidence_entries', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  seq: bigserial({ mode: 'number' }).notNull().unique(),
  organizationId: org(),
  assetId: text()
    .notNull()
    .references(() => assets.id),
  buyerId: text()
    .notNull()
    .references(() => buyers.id),
  type: evidenceType().notNull(),
  channel: contactChannel().notNull(),
  happenedAt: timestamp({ withTimezone: true }).notNull(),
  recordedAt: timestamp({ withTimezone: true }).notNull(),
  recordedByUserId: text().references(() => user.id),
  data: jsonb().$type<Record<string, unknown>>().notNull().default({}),
  correctsEntryId: text(),
  prevHash: char({ length: 64 }).notNull(),
  hash: char({ length: 64 }).notNull(),
});

export const buyersRelations = relations(buyers, ({ many }) => ({ evidence: many(evidenceEntries) }));
export const evidenceEntriesRelations = relations(evidenceEntries, ({ one }) => ({
  buyer: one(buyers, { fields: [evidenceEntries.buyerId], references: [buyers.id] }),
  asset: one(assets, { fields: [evidenceEntries.assetId], references: [assets.id] }),
}));

export type Buyer = typeof buyers.$inferSelect;
export type EvidenceEntry = typeof evidenceEntries.$inferSelect;

export const enquiries = pgTable('enquiries', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: org(),
  assetId: text().references(() => assets.id),
  buyerId: text()
    .notNull()
    .references(() => buyers.id),
  channel: contactChannel().notNull(),
  message: text(),
  createdAt: timestamp().defaultNow().notNull(),
});

export type Enquiry = typeof enquiries.$inferSelect;
