import { relations } from 'drizzle-orm';
import { pgTable, pgEnum, text, integer, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';
import { engagements } from './core';

export const DOCUMENT_TYPES = ['proposal', 'agreement', 'agreement_signed', 'agreement_scan', 'invoice', 'receipt'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'cheque'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const documentType = pgEnum('document_type', DOCUMENT_TYPES);
export const paymentMethod = pgEnum('payment_method', PAYMENT_METHODS);

export const documents = pgTable('documents', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text()
    .notNull()
    .default(DEFAULT_ORG_ID)
    .references(() => organization.id),
  engagementId: text()
    .notNull()
    .references(() => engagements.id),
  type: documentType().notNull(),
  number: text().unique(),
  storageKey: text().notNull(),
  sha256: text().notNull(),
  amountCents: bigint({ mode: 'number' }),
  vatCents: bigint({ mode: 'number' }),
  totalCents: bigint({ mode: 'number' }),
  issuedAt: timestamp().defaultNow().notNull(),
  paidAt: timestamp(),
  meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
});

export const payments = pgTable('payments', {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  documentId: text()
    .notNull()
    .references(() => documents.id),
  amountCents: bigint({ mode: 'number' }).notNull(),
  method: paymentMethod().notNull(),
  reference: text(),
  receivedAt: timestamp().notNull(),
  recordedByUserId: text().references(() => user.id),
  createdAt: timestamp().defaultNow().notNull(),
});

export const numberSequences = pgTable('number_sequences', {
  key: text().primaryKey(),
  last: integer().notNull(),
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  engagement: one(engagements, { fields: [documents.engagementId], references: [engagements.id] }),
  payments: many(payments),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  document: one(documents, { fields: [payments.documentId], references: [documents.id] }),
}));

export type Document = typeof documents.$inferSelect;
export type Payment = typeof payments.$inferSelect;
