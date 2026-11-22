'use server';
import { revalidatePath } from 'next/cache';
import { forbidden } from 'next/navigation';
import { getPortalClientId } from '@/server/portal-session';
import { decideDraft, ContentError, type Decision } from '@/server/content-approval';
import type { ActionResult } from '@/lib/form';

export async function answerDraft(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const clientId = await getPortalClientId();
  if (!clientId) forbidden();
  try {
    await decideDraft(clientId, String(form.get('draftId')), String(form.get('decision')) as Decision, String(form.get('comment') ?? ''));
  } catch (err) {
    if (err instanceof ContentError) return { error: err.message };
    throw err;
  }
  revalidatePath('/portal');
  return { ok: true };
}
