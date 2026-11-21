'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/server/auth-guard';
import { DocumentError, generateAgreementDraft, generateProposal, issueInvoice, recordAdDeposit, recordPayment } from '@/server/documents';
import { PAYMENT_METHODS, type PaymentMethod } from '@/db/schema';
import { formCents, formText, FormError, type ActionResult } from '@/lib/form';

function dateFrom(form: FormData): Date {
  const raw = formText(form, 'date');
  const d = raw ? new Date(`${raw}T12:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime())) throw new FormError('Enter a valid date');
  return d;
}

async function run(engagementId: string, work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work();
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    if (err instanceof DocumentError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/studio/engagements/${engagementId}`);
  return { ok: true };
}

export async function createDocument(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const engagementId = String(form.get('engagementId'));
  const op = String(form.get('op'));
  const make = { proposal: generateProposal, agreement: generateAgreementDraft, invoice: issueInvoice }[op];
  if (!make) return { error: 'Unknown document' };
  return run(engagementId, () => make(engagementId));
}

export async function addAdDeposit(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const engagementId = String(form.get('engagementId'));
  return run(engagementId, async () => {
    const reference = formText(form, 'reference');
    if (!reference) throw new FormError('Enter the bank transfer reference');
    await recordAdDeposit(engagementId, formCents(form, 'amountRupees', 'Amount'), reference, dateFrom(form));
  });
}

export async function addPayment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const engagementId = String(form.get('engagementId'));
  return run(engagementId, async () => {
    const method = String(form.get('method')) as PaymentMethod;
    if (!PAYMENT_METHODS.includes(method)) throw new FormError('Choose how it was paid');
    await recordPayment(
      String(form.get('documentId')),
      formCents(form, 'amountRupees', 'Amount'),
      method,
      formText(form, 'reference'),
      dateFrom(form),
      userId,
    );
  });
}
