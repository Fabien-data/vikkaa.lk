'use server';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { requireStaff } from '@/server/auth-guard';
import { saveSettings, SETTINGS_SECTIONS, type SettingsSection } from '@/server/settings';
import { savePackage, PackageError } from '@/server/packages';
import { saveChannel, ChannelError } from '@/server/channels';
import { saveTemplate, TemplateError } from '@/server/templates';
import { PACKAGE_KINDS, CHANNEL_STATUSES, type PackageKind, type ChannelStatus } from '@/db/schema';
import { ASSET_CATEGORIES, type AssetCategory } from '@/lib/enums';
import { formCents, formInt, formText, FormError, type ActionResult } from '@/lib/form';

const t = (f: FormData, name: string) => formText(f, name) ?? '';

/** A percentage field as basis points; `blank` is returned for an empty field. */
function percentBp<T>(f: FormData, name: string, label: string, blank: T): number | T {
  const raw = String(f.get(name) ?? '').trim();
  if (raw === '') return blank;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new FormError(`${label}: enter a percentage from 0 to 100`);
  return Math.round(n * 100);
}

const PARSE: Record<SettingsSection, (f: FormData) => Record<string, unknown>> = {
  business: (f) => ({ legalName: formText(f, 'legalName') ?? 'Vikkaa.lk', registrationNo: t(f, 'registrationNo') }),
  bank: (f) => ({ accountName: t(f, 'accountName'), accountNumber: t(f, 'accountNumber'), bank: t(f, 'bank'), branch: t(f, 'branch') }),
  runway: (f) => ({
    monthlyCostCents: formCents(f, 'monthlyCostRupees', 'Monthly cost'),
    cashOnHandCents: formCents(f, 'cashOnHandRupees', 'Cash on hand'),
    asOf: t(f, 'asOf'),
    gateCShareBp: percentBp(f, 'gateCSharePercent', 'Gate C share', 5_000),
  }),
  gates: (f) => ({ a: t(f, 'a'), b: t(f, 'b'), c: t(f, 'c') }),
  messaging: (f) => ({
    quietStartHour: formInt(f, 'quietStartHour', 'Sending starts at', 0, 23),
    quietEndHour: formInt(f, 'quietEndHour', 'Sending stops at', 1, 24),
    perSenderDailyCap: formInt(f, 'perSenderDailyCap', 'Outreach emails per founder per day', 0, 1000),
    emailDailyCap: formInt(f, 'emailDailyCap', 'Emails per day (all)', 0, 100_000),
    transactionalReserve: formInt(f, 'transactionalReserve', 'Kept back for receipts and reminders', 0, 100_000),
  }),
  commission: (f) => ({
    propertyBp: percentBp(f, 'propertyPercent', 'Property commission', 0),
    highValueBp: percentBp(f, 'highValuePercent', 'High-value commission', 0),
    highValueThresholdCents: formCents(f, 'highValueThresholdRupees', 'High-value threshold'),
    vehicleBp: percentBp(f, 'vehiclePercent', 'Vehicle commission', 0),
    vehicleMinCents: formCents(f, 'vehicleMinRupees', 'Vehicle minimum'),
    exclusiveDays: formInt(f, 'exclusiveDays', 'Exclusive period', 1, 365),
    followOnMonths: formInt(f, 'followOnMonths', 'Follow-on period', 0, 36),
  }),
  limits: (f) => ({
    foundingCap: formInt(f, 'foundingCap', 'Founding clients', 0, 50),
    maxLiveCampaigns: formInt(f, 'maxLiveCampaigns', 'Live campaigns at once', 1, 100),
  }),
};

function userError(err: unknown): string | null {
  if (err instanceof FormError || err instanceof PackageError || err instanceof ChannelError || err instanceof TemplateError) return err.message;
  if (err instanceof ZodError) return err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  return null;
}

export async function saveSettingsSection(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const section = String(form.get('section')) as SettingsSection;
  if (!SETTINGS_SECTIONS.includes(section)) return { error: 'Unknown settings section' };
  try {
    await saveSettings(section, PARSE[section](form) as never, userId);
  } catch (err) {
    const message = userError(err);
    if (message) return { error: message };
    throw err;
  }
  revalidatePath('/studio', 'layout');
  return { ok: true };
}

export async function savePackageAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const kind = String(form.get('kind')) as PackageKind;
    const category = String(form.get('category')) as AssetCategory;
    if (!PACKAGE_KINDS.includes(kind) || !ASSET_CATEGORIES.includes(category)) throw new FormError('Choose a kind and category');
    const optionalInt = (name: string, label: string, min: number, max: number) => (form.get(name) ? formInt(form, name, label, min, max) : null);
    await savePackage(
      {
        name: t(form, 'name'),
        segment: t(form, 'segment') || 'private',
        category,
        kind,
        priceCents: formCents(form, 'priceRupees', 'Price'),
        unitsPerMonth: optionalInt('unitsPerMonth', 'Units a month', 1, 500),
        exclusiveDays: optionalInt('exclusiveDays', 'Exclusive days', 1, 365),
        followOnMonths: optionalInt('followOnMonths', 'Follow-on months', 0, 36),
        commissionBp: percentBp(form, 'commissionPercent', 'Commission', null),
        commissionMinCents: formCents(form, 'commissionMinRupees', 'Minimum commission'),
        founding: form.get('founding') === 'on',
        publicFrom: form.get('publicFrom') === 'on',
        active: form.get('active') === 'on',
        sortOrder: Number(form.get('sortOrder') || 0) || 0,
      },
      formText(form, 'id') ?? undefined,
    );
  } catch (err) {
    const message = userError(err);
    if (message) return { error: message };
    throw err;
  }
  revalidatePath('/studio/settings/prices');
  return { ok: true };
}

export async function saveChannelAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const status = String(form.get('status')) as ChannelStatus;
    if (!CHANNEL_STATUSES.includes(status)) throw new FormError('Choose a status');
    await saveChannel(String(form.get('key')), {
      handle: formText(form, 'handle'),
      url: formText(form, 'url'),
      status,
      showInFooter: form.get('showInFooter') === 'on',
      notes: formText(form, 'notes'),
      externalId: formText(form, 'externalId'),
    });
  } catch (err) {
    const message = userError(err);
    if (message) return { error: message };
    throw err;
  }
  revalidatePath('/studio/settings/connections');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function saveTemplateAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    await saveTemplate(String(form.get('id')), { subject: formText(form, 'subject'), body: String(form.get('body') ?? ''), active: form.get('active') === 'on' });
  } catch (err) {
    const message = userError(err);
    if (message) return { error: message };
    throw err;
  }
  revalidatePath('/studio/settings/templates');
  return { ok: true };
}
