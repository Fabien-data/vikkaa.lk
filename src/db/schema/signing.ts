import { relations } from 'drizzle-orm';
import { pgTable, pgEnum, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { engagements } from './core';

export const SIGNATORY_ROLES = ['owner', 'co_owner', 'poa_holder'] as const;
export type SignatoryRole = (typeof SIGNATORY_ROLES)[number];
export const signatoryRole = pgEnum('signatory_role', SIGNATORY_ROLES);

export const signatories = pgTable('signatories', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  engagementId: text()
    .notNull()
    .references(() => engagements.id),
  role: signatoryRole().notNull(),
  name: text().notNull(),
  phone: text().notNull(),
  email: text(),
  poaStorageKey: text(),
  otpHash: text(),
  otpExpiresAt: timestamp(),
  otpSentAt: timestamp(),
  otpAttempts: integer().notNull().default(0),
  signedAt: timestamp(),
  signedName: text(),
  signedIdNumber: text(),
  signedPhone: text(),
  signedIp: text(),
  signedUserAgent: text(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const signatoriesRelations = relations(signatories, ({ one }) => ({
  engagement: one(engagements, { fields: [signatories.engagementId], references: [engagements.id] }),
}));

export type Signatory = typeof signatories.$inferSelect;
