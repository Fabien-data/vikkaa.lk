'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/server/auth-guard';
import { approveTemplate, AgreementTemplateError, newVersion, saveDraftClauses } from '@/server/agreement-templates';
import { formText, type ActionResult } from '@/lib/form';

/** Clauses are typed one per paragraph (a blank line between clauses). */
const splitClauses = (raw: string) =>
  raw
    .split(/\r?\n\s*\r?\n/)
    .map((c) => c.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean);

async function guarded(fn: () => Promise<void>, id: string): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof AgreementTemplateError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/studio/settings/agreements/${id}`);
  revalidatePath('/studio/settings/agreements');
  return { ok: true };
}

export async function saveClauses(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  return guarded(() => saveDraftClauses(id, splitClauses(String(form.get('clauses') ?? '')), formText(form, 'notes')), id);
}

export async function approve(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const id = String(form.get('id'));
  if (form.get('confirmed') !== 'on') return { error: 'Tick the box to confirm the lawyer approved this exact wording in writing.' };
  return guarded(() => approveTemplate(id, { lawyerName: formText(form, 'lawyerName') ?? '', reference: formText(form, 'reference') ?? '', userId }), id);
}

export async function startNewVersion(fromId: string): Promise<void> {
  const { userId } = await requireStaff();
  const t = await newVersion(fromId, userId);
  revalidatePath('/studio/settings/agreements');
  redirect(`/studio/settings/agreements/${t.id}`);
}
