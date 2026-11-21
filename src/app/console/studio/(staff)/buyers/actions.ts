'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { buyers, evidenceEntries, EVIDENCE_TYPES, CHANNELS, type Channel, type EvidenceType } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { appendEvidence, EvidenceError } from '@/server/evidence-log';
import { upsertBuyerByPhone } from '@/server/buyers';
import { normalisePhone } from '@/lib/phone';
import { formCents, formOptionalCents, formText, FormError, type ActionResult } from '@/lib/form';

/** Studio datetime-local inputs are Sri Lanka time (UTC+05:30); the server runs in UTC. */
function sriLankaTime(value: string | null): Date {
  if (!value) return new Date();
  const d = new Date(`${value}:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new FormError('Enter a valid date and time');
  return d;
}

async function guard(work: () => Promise<void>, paths: string[]): Promise<ActionResult> {
  try {
    await work();
  } catch (err) {
    if (err instanceof FormError || err instanceof EvidenceError) return { error: err.message };
    throw err;
  }
  paths.forEach((p) => revalidatePath(p));
  return { ok: true };
}

export async function saveBuyer(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  return guard(async () => {
    await db
      .update(buyers)
      .set({
        name: formText(form, 'name'),
        email: formText(form, 'email'),
        nic: formText(form, 'nic'),
        budgetMinCents: formOptionalCents(form, 'budgetMinRupees', 'Budget from'),
        budgetMaxCents: formOptionalCents(form, 'budgetMaxRupees', 'Budget to'),
        areas: formText(form, 'areas'),
        timeline: formText(form, 'timeline'),
        financing: formText(form, 'financing'),
      })
      .where(eq(buyers.id, id));
  }, [`/studio/buyers/${id}`]);
}

const LOGGABLE: EvidenceType[] = ['contact', 'viewing', 'test_drive', 'offer'];

export async function logEvidence(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const assetId = String(form.get('assetId'));
  let buyerId = formText(form, 'buyerId');
  return guard(async () => {
    const type = String(form.get('type')) as EvidenceType;
    const channel = String(form.get('channel')) as Channel;
    if (!LOGGABLE.includes(type) || !EVIDENCE_TYPES.includes(type)) throw new FormError('Choose what happened');
    if (!CHANNELS.includes(channel)) throw new FormError('Choose how it happened');
    if (!buyerId) {
      const phone = normalisePhone(formText(form, 'buyerPhone'));
      if (!phone) throw new FormError('Enter the buyer’s phone number');
      buyerId = (await upsertBuyerByPhone(phone, { name: formText(form, 'buyerName'), source: channel })).id;
    }
    const data: Record<string, unknown> = {};
    const notes = formText(form, 'notes');
    if (notes) data.notes = notes;
    if (type === 'offer') {
      const offerCents = formCents(form, 'offerRupees', 'Offer');
      if (!offerCents) throw new FormError('Enter the offer amount');
      data.offerCents = offerCents;
    }
    await appendEvidence({ assetId, buyerId, type, channel, happenedAt: sriLankaTime(formText(form, 'happenedAt')), data, recordedByUserId: userId });
  }, [`/studio/assets/${assetId}`, `/studio/buyers/${buyerId ?? ''}`]);
}

export async function correctEvidence(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const entryId = String(form.get('entryId'));
  const [original] = await db.select().from(evidenceEntries).where(eq(evidenceEntries.id, entryId));
  if (!original) return { error: 'Entry not found' };
  return guard(async () => {
    const notes = formText(form, 'notes');
    if (!notes) throw new FormError('Say what was wrong');
    await appendEvidence({
      assetId: original.assetId,
      buyerId: original.buyerId,
      type: 'correction',
      channel: original.channel,
      happenedAt: new Date(),
      data: { notes },
      recordedByUserId: userId,
      correctsEntryId: original.id,
    });
  }, [`/studio/assets/${original.assetId}`, `/studio/buyers/${original.buyerId}`]);
}
