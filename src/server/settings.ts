import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { orgSettings } from '@/db/schema';
import { config } from '@/lib/config';
import { COMMISSION_BP, DEFAULT_EXCLUSIVE_DAYS, DEFAULT_FOLLOW_ON_MONTHS, DEFAULT_ORG_ID } from '@/lib/rules';

const text = z.string().default('');
const cents = z.number().int().nonnegative().default(0);

const sections = {
  business: z.object({ legalName: z.string().default('Vikkaa.lk'), registrationNo: text }),
  bank: z.object({ accountName: text, accountNumber: text, bank: text, branch: text }),
  runway: z.object({
    monthlyCostCents: cents,
    cashOnHandCents: cents,
    /** YYYY-MM-DD the cash figure was true on. */
    asOf: text,
    /** Gate C: recurring revenue must cover this share of monthly cost (basis points). */
    gateCShareBp: z.number().int().min(0).max(10_000).default(5_000),
    /** Cash spent delivering for one client in a month (travel, contractors, tools). Rs 20,000 until real costs replace it. */
    directCostPerClientCents: z.number().int().nonnegative().default(2_000_000),
  }),
  gates: z.object({ a: z.string().default('2026-12-20'), b: z.string().default('2027-01-31'), c: z.string().default('2027-02-28') }),
  messaging: z.object({
    quietStartHour: z.number().int().min(0).max(23).default(9),
    quietEndHour: z.number().int().min(1).max(24).default(19),
    perSenderDailyCap: z.number().int().min(0).default(30),
    emailDailyCap: z.number().int().min(0).default(100),
    /** Emails kept back each day for receipts, codes and reminders. */
    transactionalReserve: z.number().int().min(0).default(30),
  }),
  commission: z.object({
    propertyBp: z.number().int().min(0).max(2_000).default(COMMISSION_BP.property),
    highValueBp: z.number().int().min(0).max(2_000).default(200),
    highValueThresholdCents: cents,
    vehicleBp: z.number().int().min(0).max(2_000).default(COMMISSION_BP.vehicle),
    vehicleMinCents: cents,
    exclusiveDays: z.number().int().min(1).max(365).default(DEFAULT_EXCLUSIVE_DAYS),
    followOnMonths: z.number().int().min(0).max(36).default(DEFAULT_FOLLOW_ON_MONTHS),
  }),
  limits: z.object({
    foundingCap: z.number().int().min(0).default(3),
    maxLiveCampaigns: z.number().int().min(1).default(3),
  }),
};

const settingsSchema = z.object({
  business: sections.business.prefault({}),
  bank: sections.bank.prefault({}),
  runway: sections.runway.prefault({}),
  gates: sections.gates.prefault({}),
  messaging: sections.messaging.prefault({}),
  commission: sections.commission.prefault({}),
  limits: sections.limits.prefault({}),
});

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsSection = keyof Settings;
export const SETTINGS_SECTIONS = Object.keys(sections) as SettingsSection[];

async function readRaw(): Promise<Record<string, unknown>> {
  const [row] = await db.select().from(orgSettings).where(eq(orgSettings.organizationId, DEFAULT_ORG_ID));
  return row?.data ?? {};
}

/** Saved settings with defaults filled in. Cached per request. */
export const getSettings = cache(async (): Promise<Settings> => settingsSchema.parse(await readRaw()));

/** Replaces one section; the others are kept as saved. Throws a ZodError on bad values. */
export async function saveSettings<K extends SettingsSection>(section: K, values: z.input<(typeof sections)[K]>, userId?: string): Promise<void> {
  const parsed = sections[section].parse(values);
  const data = { ...(await readRaw()), [section]: parsed };
  await db
    .insert(orgSettings)
    .values({ organizationId: DEFAULT_ORG_ID, data, updatedByUserId: userId })
    .onConflictDoUpdate({ target: orgSettings.organizationId, set: { data, updatedAt: new Date(), updatedByUserId: userId } });
}

/** Bank details for documents: the Studio settings once filled in, else the deploy env. */
export async function bankDetails(): Promise<Settings['bank']> {
  const { bank } = await getSettings();
  return bank.accountNumber ? bank : { accountName: config.bank.accountName, accountNumber: config.bank.accountNumber, bank: config.bank.bank, branch: config.bank.branch };
}
