'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { clients, comparables, engagements, assets, signatories } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { scoreFit, type IntakeAnswers } from '@/server/fit-scorer';
import { rangeFor } from '@/server/area-prices';
import { advanceEngagement } from '@/server/pipeline';
import { whatsappLink } from '@/lib/whatsapp';
import { ENGAGEMENT_TYPES, type EngagementType } from '@/lib/enums';
import { COMMISSION_BP, DEFAULT_EXCLUSIVE_DAYS, DEFAULT_FOLLOW_ON_MONTHS } from '@/lib/rules';
import { formCents, formInt, formText, FormError, type ActionResult } from '@/lib/form';

export async function createEngagement(form: FormData): Promise<void> {
  await requireStaff();
  const clientId = String(form.get('clientId'));
  const type = String(form.get('type')) as EngagementType;
  if (!ENGAGEMENT_TYPES.includes(type)) throw new Error('Unknown engagement type');
  const [e] = await db
    .insert(engagements)
    .values({
      clientId,
      type,
      commissionRateBp: COMMISSION_BP.property,
      exclusiveDays: DEFAULT_EXCLUSIVE_DAYS,
      followOnMonths: DEFAULT_FOLLOW_ON_MONTHS,
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
  if (signed.length) return { error: 'Terms are locked because someone has signed the agreement.' };
  try {
    const percent = Number(String(form.get('commissionPercent') ?? '').trim());
    if (!Number.isFinite(percent) || percent < 0 || percent > 20) throw new FormError('Commission: enter a percentage between 0 and 20');
    await db
      .update(engagements)
      .set({
        upfrontFeeCents: formCents(form, 'upfrontFeeRupees', 'Upfront fee'),
        adBudgetCents: formCents(form, 'adBudgetRupees', 'Ad budget'),
        commissionRateBp: Math.round(percent * 100),
        commissionApplies: form.get('commissionApplies') === 'on',
        exclusiveDays: formInt(form, 'exclusiveDays', 'Exclusive days', 1, 365),
        followOnMonths: formInt(form, 'followOnMonths', 'Follow-on months', 0, 36),
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
