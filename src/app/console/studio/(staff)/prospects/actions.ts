'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/server/auth-guard';
import {
  convertToClient,
  logTouch,
  markDoNotContact,
  markWhatsappSent,
  ProspectError,
  quickAdd,
  sendAllDue,
  sendStepEmail,
  setStatus,
  skipStep,
  updateProspect,
  type ProspectInput,
  type Touch,
} from '@/server/prospects';
import { PackageError } from '@/server/packages';
import { PROSPECT_SEGMENTS, PROSPECT_STATUSES, type ProspectSegment, type ProspectStatus } from '@/db/schema';
import { formText, type ActionResult } from '@/lib/form';

function readProspect(form: FormData): ProspectInput {
  const segment = String(form.get('segment') ?? 'other') as ProspectSegment;
  if (!PROSPECT_SEGMENTS.includes(segment)) throw new ProspectError('Choose who they are');
  return {
    name: formText(form, 'name') ?? '',
    segment,
    phone: formText(form, 'phone'),
    email: formText(form, 'email'),
    contactName: formText(form, 'contactName'),
    contactRole: formText(form, 'contactRole'),
    district: formText(form, 'district'),
    area: formText(form, 'area'),
    links: formText(form, 'links'),
    stockNote: formText(form, 'stockNote'),
    source: formText(form, 'source'),
    ownerUserId: formText(form, 'ownerUserId'),
  };
}

/** A button pressed twice, or on a page that is out of date, should refresh the page, not crash it. */
async function ignoreStale(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (!(err instanceof ProspectError)) throw err;
  }
}

async function guarded(fn: () => Promise<void>, paths: string[]): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ProspectError || err instanceof PackageError) return { error: err.message };
    throw err;
  }
  for (const p of paths) revalidatePath(p);
  return { ok: true };
}

export async function addProspect(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  let id = '';
  const result = await guarded(async () => {
    const input = readProspect(form);
    id = (await quickAdd({ ...input, ownerUserId: input.ownerUserId ?? userId, source: input.source ?? 'founder' })).id;
  }, ['/studio/prospects', '/studio']);
  if (result?.error) return result;
  if (form.get('open') === '1') redirect(`/studio/prospects/${id}`);
  return result;
}

export async function saveProspect(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  return guarded(() => updateProspect(id, readProspect(form)), [`/studio/prospects/${id}`, '/studio/prospects']);
}

export async function changeStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  const status = String(form.get('status')) as ProspectStatus;
  if (!PROSPECT_STATUSES.includes(status)) return { error: 'Unknown status' };
  return guarded(() => setStatus(id, status, { lostReason: formText(form, 'lostReason') }), [`/studio/prospects/${id}`, '/studio/prospects', '/studio']);
}

const TOUCH_CHANNELS = ['call', 'visit', 'meeting', 'whatsapp', 'email'] as const;

export async function recordTouch(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const id = String(form.get('id'));
  const channel = String(form.get('channel')) as Touch['channel'];
  if (!TOUCH_CHANNELS.includes(channel)) return { error: 'Choose how you were in touch' };
  const outcome = formText(form, 'outcome') ?? 'done';
  return guarded(() => logTouch(id, { channel, outcome, note: formText(form, 'note') }, userId), [`/studio/prospects/${id}`, '/studio']);
}

export async function sendDueEmail(prospectId: string): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const r = await sendStepEmail(prospectId, userId);
  revalidatePath(`/studio/prospects/${prospectId}`);
  revalidatePath('/studio');
  return r.status === 'sent' ? { ok: true } : { error: r.reason };
}

/** The war room's one-click batch: every ticked due email, sent from this founder. */
export async function sendDueBatch(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const ids = form.getAll('prospectId').map(String).filter(Boolean);
  if (!ids.length) return { error: 'Tick at least one email to send' };
  const { sent, problems } = await sendAllDue(ids, userId);
  revalidatePath('/studio');
  revalidatePath('/studio/prospects');
  if (!sent && problems.length) return { error: problems.join(' · ') };
  return { ok: true, warning: problems.length ? `Sent ${sent}. Not sent: ${problems.join(' · ')}` : undefined };
}

export async function whatsappSent(prospectId: string): Promise<void> {
  const { userId } = await requireStaff();
  await ignoreStale(() => markWhatsappSent(prospectId, userId));
  revalidatePath('/studio');
  revalidatePath(`/studio/prospects/${prospectId}`);
}

export async function callOutcome(prospectId: string, outcome: 'no_answer' | 'talked' | 'pitched'): Promise<void> {
  const { userId } = await requireStaff();
  await ignoreStale(() => logTouch(prospectId, { channel: 'call', outcome }, userId));
  revalidatePath('/studio');
  revalidatePath(`/studio/prospects/${prospectId}`);
}

export async function skipDueStep(prospectId: string): Promise<void> {
  const { userId } = await requireStaff();
  await ignoreStale(() => skipStep(prospectId, userId));
  revalidatePath('/studio');
  revalidatePath(`/studio/prospects/${prospectId}`);
}

export async function doNotContact(prospectId: string): Promise<void> {
  const { userId } = await requireStaff();
  await ignoreStale(() => markDoNotContact(prospectId, userId));
  revalidatePath(`/studio/prospects/${prospectId}`);
  revalidatePath('/studio');
}

export async function convertProspect(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = String(form.get('id'));
  let engagementId = '';
  const result = await guarded(async () => {
    engagementId = (await convertToClient(id, { packageId: formText(form, 'packageId') })).engagementId;
  }, ['/studio/prospects', `/studio/prospects/${id}`]);
  if (result?.error) return result;
  redirect(`/studio/engagements/${engagementId}`);
}
