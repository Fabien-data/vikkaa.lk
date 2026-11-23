import { sql } from 'drizzle-orm';
import { pgTable, pgEnum, text, integer, boolean, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { organization, user } from './auth';
import { clients, subjectType } from './core';

const id = () => text().primaryKey().$defaultFn(() => crypto.randomUUID());
const org = () =>
  text()
    .notNull()
    .default(DEFAULT_ORG_ID)
    .references(() => organization.id);

export const PROSPECT_SEGMENTS = ['dealer', 'developer', 'agent', 'private', 'overseas', 'other'] as const;
export type ProspectSegment = (typeof PROSPECT_SEGMENTS)[number];
export const PROSPECT_STATUSES = ['new', 'contacted', 'replied', 'meeting', 'won', 'lost', 'nurture'] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];
export const prospectSegment = pgEnum('prospect_segment', PROSPECT_SEGMENTS);
export const prospectStatus = pgEnum('prospect_status', PROSPECT_STATUSES);

/** A business or person Vikkaa is trying to win as a client. Becomes a client (clientId) when won. */
export const prospects = pgTable(
  'prospects',
  {
    id: id(),
    organizationId: org(),
    name: text().notNull(),
    segment: prospectSegment().notNull(),
    contactName: text(),
    contactRole: text(),
    phone: text(),
    email: text(),
    district: text(),
    area: text(),
    links: text(),
    stockNote: text(),
    /** What we saw in their stock or process, shown on their pitch page. */
    diagnosis: text(),
    /** The follow-up they agreed to in conversation, shown on their pitch page. */
    agreedNextStep: text(),
    source: text(),
    utm: jsonb().$type<Record<string, string>>(),
    status: prospectStatus().notNull().default('new'),
    statusChangedAt: timestamp({ withTimezone: true }),
    ownerUserId: text().references(() => user.id),
    /** Index of the next cadence step (see src/server/prospects.ts). */
    cadenceStep: integer().notNull().default(0),
    nextActionAt: timestamp({ withTimezone: true }),
    lostReason: text(),
    clientId: text().references(() => clients.id),
    /** Unguessable token for the personal pitch page at /for/:token. */
    pitchToken: text()
      .notNull()
      .unique()
      .$defaultFn(() => crypto.randomUUID().replace(/-/g, '')),
    pitchFirstViewedAt: timestamp({ withTimezone: true }),
    pitchLastViewedAt: timestamp({ withTimezone: true }),
    pitchViews: integer().notNull().default(0),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('prospects_org_phone_idx').on(t.organizationId, t.phone).where(sql`${t.phone} is not null`),
    index('prospects_status_next_idx').on(t.status, t.nextActionAt),
  ],
);

export const MESSAGE_CHANNELS = ['email', 'sms', 'whatsapp', 'call', 'visit', 'meeting'] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];
export const MESSAGE_PURPOSES = ['transactional', 'outreach', 'circle', 'marketing'] as const;
export type MessagePurpose = (typeof MESSAGE_PURPOSES)[number];
export const MESSAGE_STATUSES = ['draft', 'queued', 'sending', 'sent', 'failed', 'blocked', 'cancelled', 'logged'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export const messageChannel = pgEnum('message_channel', MESSAGE_CHANNELS);
export const messagePurpose = pgEnum('message_purpose', MESSAGE_PURPOSES);
export const messageStatus = pgEnum('message_status', MESSAGE_STATUSES);
export const messageDirection = pgEnum('message_direction', ['out', 'in']);

/** Outbox and activity log: every email, SMS, WhatsApp draft and logged call or visit, in one timeline. */
export const messages = pgTable(
  'messages',
  {
    id: id(),
    organizationId: org(),
    channel: messageChannel().notNull(),
    direction: messageDirection().notNull().default('out'),
    purpose: messagePurpose().notNull(),
    status: messageStatus().notNull(),
    subjectType: subjectType(),
    subjectId: text(),
    toAddress: text(),
    fromUserId: text().references(() => user.id),
    templateKey: text(),
    subject: text(),
    body: text(),
    /** For logged touches: no_answer, talked, pitched, sent… */
    outcome: text(),
    scheduledAt: timestamp({ withTimezone: true }),
    sentAt: timestamp({ withTimezone: true }),
    attempts: integer().notNull().default(0),
    lastError: text(),
    providerId: text(),
    /** Makes automated messages happen exactly once. */
    dedupeKey: text().unique(),
    blockedReason: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('messages_status_scheduled_idx').on(t.status, t.scheduledAt), index('messages_subject_idx').on(t.subjectType, t.subjectId)],
);

/** `outreach` grants record the basis for one-to-one business contact (introduction, their request…); without one, nothing is sent. */
export const CONSENT_PURPOSES = ['circle', 'marketing', 'all', 'outreach'] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];
export const consentPurpose = pgEnum('consent_purpose', CONSENT_PURPOSES);

/** Append-only consent ledger. The latest event per contact and purpose wins. `all` withdrawals block every non-transactional message. */
export const consents = pgTable(
  'consents',
  {
    id: id(),
    organizationId: org(),
    /** E.164 phone or lowercase email. */
    contact: text().notNull(),
    purpose: consentPurpose().notNull(),
    granted: boolean().notNull(),
    source: text().notNull(),
    evidence: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    recordedByUserId: text().references(() => user.id),
    at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('consents_contact_idx').on(t.contact, t.at)],
);

/** Outreach and marketing copy staff can edit. Transactional copy lives in code. */
export const messageTemplates = pgTable(
  'message_templates',
  {
    id: id(),
    organizationId: org(),
    key: text().notNull(),
    channel: messageChannel().notNull(),
    language: text().notNull().default('en'),
    label: text().notNull(),
    subject: text(),
    body: text().notNull(),
    active: boolean().notNull().default(true),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp()
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex('message_templates_key_idx').on(t.organizationId, t.key, t.channel, t.language)],
);

export type Prospect = typeof prospects.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Consent = typeof consents.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
