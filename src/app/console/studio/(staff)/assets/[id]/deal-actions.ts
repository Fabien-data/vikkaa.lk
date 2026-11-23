'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/server/auth-guard';
import { agreeSale, completeSale, DealError, fallThrough } from '@/server/deals';
import { DocumentError } from '@/server/documents';
import { InvalidTransitionError } from '@/server/pipeline';
import { EvidenceError } from '@/server/evidence-log';
import { formatLkr } from '@/lib/money';
import { formCents, formText, sriLankaTime, FormError, type ActionResult } from '@/lib/form';

function friendly(err: unknown): string | null {
  if (err instanceof DealError || err instanceof DocumentError || err instanceof FormError || err instanceof InvalidTransitionError || err instanceof EvidenceError) return err.message;
  return null;
}

export async function agreeSaleAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const assetId = String(form.get('assetId'));
  try {
    const { commission, invoice } = await agreeSale({
      assetId,
      buyerId: formText(form, 'buyerId'),
      priceCents: formCents(form, 'priceRupees', 'Agreed price'),
      agreedAt: sriLankaTime(formText(form, 'agreedAt')),
      completionDueOn: formText(form, 'completionDueOn'),
      advanceCents: formCents(form, 'advanceRupees', 'Advance'),
      notary: formText(form, 'notary'),
      userId,
    });
    revalidatePath(`/studio/assets/${assetId}`);
    revalidatePath('/studio/money');
    return {
      ok: true,
      warning: invoice
        ? `Commission invoice ${invoice.number}: ${formatLkr(commission.totalCents)} (${formatLkr(commission.grossCents)} commission${commission.creditCents ? `, less ${formatLkr(commission.creditCents)} fee credit` : ''}). ${commission.reason}`
        : `No commission due: ${commission.reason}`,
    };
  } catch (err) {
    const message = friendly(err);
    if (message) return { error: message };
    throw err;
  }
}

export async function completeSaleAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const assetId = String(form.get('assetId'));
  try {
    await completeSale(String(form.get('dealId')), sriLankaTime(formText(form, 'completedAt')));
  } catch (err) {
    const message = friendly(err);
    if (message) return { error: message };
    throw err;
  }
  revalidatePath(`/studio/assets/${assetId}`);
  return { ok: true };
}

export async function fallThroughAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const assetId = String(form.get('assetId'));
  try {
    await fallThrough(String(form.get('dealId')), formText(form, 'reason') ?? '');
  } catch (err) {
    const message = friendly(err);
    if (message) return { error: message };
    throw err;
  }
  revalidatePath(`/studio/assets/${assetId}`);
  revalidatePath('/studio/money');
  return { ok: true };
}
