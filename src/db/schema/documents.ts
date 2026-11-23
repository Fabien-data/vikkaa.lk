import { relations } from 'drizzle-orm';
import { pgTable, pgEnum, text, integer, bigint, jsonb, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';
import { agreementKind, assets, engagements } from './core';

export const DOCUMENT_TYPES = [
  'proposal',
  'agreement',
  'agreement_signed',
  'agreement_scan',
  'invoice',
  'receipt',
  'retainer_invoice',
  'commission_invoice',
  'claim_pack',
] as const;
/** Documents that bill the client for Vikkaa's own revenue (not the ad deposit). */
export const REVENUE_INVOICE_TYPES = ['invoice', 'retainer_invoice', 'commission_invoice'] as const;
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
  assetId: text().references(() => assets.id),
  dueOn: date(),
  voidedAt: timestamp({ withTimezone: true }),
  voidReason: text(),
  /** Idempotency key for automated documents, e.g. retainer:{engagementId}:{YYYY-MM}. */
  key: text().unique(),
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

/** Versioned agreement wording. Approved versions are immutable; signing needs an approved version. */
export const agreementTemplates = pgTable(
  'agreement_templates',
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizationId: text()
      .notNull()
      .default(DEFAULT_ORG_ID)
      .references(() => organization.id),
    kind: agreementKind().notNull(),
    version: integer().notNull(),
    clauses: jsonb().$type<string[]>().notNull(),
    notes: text(),
    createdByUserId: text().references(() => user.id),
    approvedAt: timestamp({ withTimezone: true }),
    /** The lawyer who confirmed the wording in writing. */
    approvedBy: text(),
    approvalReference: text(),
    approvedByUserId: text().references(() => user.id),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('agreement_templates_kind_version_idx').on(t.organizationId, t.kind, t.version)],
);

export type Document = typeof documents.$inferSelect;
export type AgreementTemplate = typeof agreementTemplates.$inferSelect;
export type Payment = typeof payments.$inferSelect;
