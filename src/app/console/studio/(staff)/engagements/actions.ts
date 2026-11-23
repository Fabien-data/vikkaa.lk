'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { clients, comparables, engagements, assets, signatories } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { scoreFit, type IntakeAnswers } from '@/server/fit-scorer';
import { rangeFor } from '@/server/area-prices';
import { advanceEngagement, InvalidTransitionError } from '@/server/pipeline';
import { whatsappLink } from '@/lib/whatsapp';
import { ENGAGEMENT_TYPES, type EngagementType } from '@/lib/enums';
import { AGREEMENT_KINDS, type AgreementKind } from '@/db/schema';
import { getSettings } from '@/server/settings';
import { applyPackage, PackageError } from '@/server/packages';
import { formCents, formInt, formText, FormError, type ActionResult } from '@/lib/form';

export async function createEngagement(form: FormData): Promise<void> {
  await requireStaff();
  const clientId = String(form.get('clientId'));
  const type = String(form.get('type')) as EngagementType;
  if (!ENGAGEMENT_TYPES.includes(type)) throw new Error('Unknown engagement type');
  const { commission } = await getSettings();
  // Retainers are dealer (vehicle) work; everything else starts on property terms.
  const retainer = type === 'retainer';
  const [e] = await db
    .insert(engagements)
    .values({
      clientId,
      type,
      commissionRateBp: retainer ? commission.vehicleBp : commission.propertyBp,
      commissionMinCents: retainer ? commission.vehicleMinCents : 0,
      billingDay: retainer ? 1 : null,
      exclusiveDays: commission.exclusiveDays,
      followOnMonths: commission.followOnMonths,
    })
    .returning();
  redirect(`/studio/engagements/${e.id}`);
}

export async function saveEngagement(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  const signed = await db
    .select({ id: signatories.id })
    .from(signatories)
    .where(and(eq(signatories.engagementId, id), isNotNull(signatories.signedAt)))
    .limit(1);
  const [eng] = await db.select({ signedAt: engagements.signedAt }).from(engagements).where(eq(engagements.id, id));
  if (signed.length || eng?.signedAt) return { error: 'Terms are locked because the agreement has been signed.' };
  try {
    const percent = Number(String(form.get('commissionPercent') ?? '').trim());
    if (!Number.isFinite(percent) || percent < 0 || percent > 20) throw new FormError('Commission: enter a percentage between 0 and 20');
    await db
      .update(engagements)
      .set({
        upfrontFeeCents: formCents(form, 'upfrontFeeRupees', 'Upfront fee'),
        monthlyFeeCents: formCents(form, 'monthlyFeeRupees', 'Monthly fee'),
        unitsPerMonth: form.get('unitsPerMonth') ? formInt(form, 'unitsPerMonth', 'Listings a month', 1, 500) : null,
        billingDay: form.get('billingDay') ? formInt(form, 'billingDay', 'Billing day', 1, 28) : null,
        commissionMinCents: formCents(form, 'commissionMinRupees', 'Minimum commission'),
        adBudgetCents: formCents(form, 'adBudgetRupees', 'Ad budget'),
        commissionRateBp: Math.round(percent * 100),
        commissionApplies: form.get('commissionApplies') === 'on',
        exclusiveDays: formInt(form, 'exclusiveDays', 'Exclusive days', 1, 365),
        followOnMonths: formInt(form, 'followOnMonths', 'Follow-on months', 0, 36),
        agreementKind: AGREEMENT_KINDS.includes(String(form.get('agreementKind')) as AgreementKind) ? (String(form.get('agreementKind')) as AgreementKind) : null,
        contentPlan: formText(form, 'contentPlan'),
        marketNotes: formText(form, 'marketNotes'),
      })
      .where(eq(engagements.id, id));
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/studio/engagements/${id}`);
  return { ok: true };
}

export async function applyPackageAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  const packageId = String(form.get('packageId') ?? '');
  if (!packageId) return { error: 'Choose a package' };
  try {
    await applyPackage(id, packageId);
  } catch (err) {
    if (err instanceof PackageError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/studio/engagements/${id}`);
  return { ok: true };
}

export async function recalculateFit(engagementId: string): Promise<ActionResult> {
  await requireStaff();
  const engagement = await db.query.engagements.findFirst({
    where: eq(engagements.id, engagementId),
    with: { assets: { orderBy: asc(assets.createdAt), limit: 1 } },
  });
  const answers = engagement?.intakeAnswers as IntakeAnswers | null | undefined;
  if (!engagement || !answers?.timeline) return { error: 'This engagement has no intake answers to score.' };
  const asset = engagement.assets[0];
  const { score, flags } = scoreFit(answers, asset?.askingPriceCents ?? null, asset ? await rangeFor(asset) : null);
  await db.update(engagements).set({ fitScore: score, fitFlags: flags }).where(eq(engagements.id, engagementId));
  revalidatePath(`/studio/engagements/${engagementId}`);
  return { ok: true };
}

export async function markNoGo(engagementId: string, reason: string, priceRead: string): Promise<{ whatsapp: string }> {
  await requireStaff();
  await advanceEngagement(engagementId, 'no_go', { reason, priceRead });
  const engagement = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId), with: { client: true } });
  revalidatePath(`/studio/engagements/${engagementId}`);
  return { whatsapp: whatsappLink(engagement!.client.phone, priceRead.trim()) };
}

export async function addComparable(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const engagementId = String(form.get('engagementId'));
  try {
    const description = formText(form, 'description');
    const source = formText(form, 'source');
    const observedOn = String(form.get('observedOn') || '');
    if (!description || !source || !observedOn) throw new FormError('Fill in description, source and date');
    await db.insert(comparables).values({
      engagementId,
      description,
      source,
      observedOn,
      priceCents: formCents(form, 'priceRupees', 'Price'),
    });
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/studio/engagements/${engagementId}`);
  return { ok: true };
}

export async function deleteComparable(id: string, engagementId: string): Promise<void> {
  await requireStaff();
  await db.delete(comparables).where(eq(comparables.id, id));
  revalidatePath(`/studio/engagements/${engagementId}`);
}

export async function clientPhone(clientId: string): Promise<string | undefined> {
  await requireStaff();
  const [c] = await db.select({ phone: clients.phone }).from(clients).where(eq(clients.id, clientId));
  return c?.phone;
}

export async function closeFile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  try {
    await advanceEngagement(id, 'closed', { reason: formText(form, 'reason') ?? '' });
  } catch (err) {
    if (err instanceof InvalidTransitionError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/studio/engagements/${id}`);
  return { ok: true };
}
