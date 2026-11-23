'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/server/auth-guard';
import { issueRetainerInvoice, periodOf } from '@/server/billing';
import { addLedgerEntry, DealError, generateClaimPack } from '@/server/deals';
import { DocumentError } from '@/server/documents';
import { AD_LEDGER_KINDS, type AdLedgerKind } from '@/db/schema';
import { formCents, formText, FormError, type ActionResult } from '@/lib/form';

async function guarded(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof DocumentError || err instanceof DealError || err instanceof FormError) return { error: err.message };
    throw err;
  }
  revalidatePath('/studio/money');
  revalidatePath('/studio');
  return { ok: true };
}

export async function issueThisMonth(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  return guarded(() => issueRetainerInvoice(String(form.get('engagementId')), formText(form, 'period') ?? periodOf(new Date())));
}

export async function makeClaimPack(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  return guarded(() => generateClaimPack(String(form.get('engagementId')), formText(form, 'buyerId')));
}

export async function addAdSpend(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const kind = String(form.get('kind')) as AdLedgerKind;
  if (!AD_LEDGER_KINDS.includes(kind)) return { error: 'Choose spend or refund' };
  return guarded(() =>
    addLedgerEntry({
      engagementId: String(form.get('engagementId')),
      kind,
      amountCents: formCents(form, 'amountRupees', 'Amount'),
      channel: formText(form, 'channel'),
      occurredOn: formText(form, 'occurredOn') ?? '',
      reference: formText(form, 'reference'),
      note: formText(form, 'note'),
      userId,
    }),
  );
}
