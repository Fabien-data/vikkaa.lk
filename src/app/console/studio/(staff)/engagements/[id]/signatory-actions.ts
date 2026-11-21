'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { signatories, SIGNATORY_ROLES, type SignatoryRole } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { putPrivate } from '@/server/storage';
import { signWithPaperScan } from '@/server/agreement-signer';
import { normalisePhone } from '@/lib/phone';
import { signPath } from '@/lib/signed-url';
import { whatsappLink } from '@/lib/whatsapp';
import { config } from '@/lib/config';
import { formText, type ActionResult } from '@/lib/form';

const LINK_TTL_SECONDS = 7 * 86_400;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function uploadedFile(form: FormData, name: string): File | null {
  const f = form.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

export async function saveSignatory(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const engagementId = String(form.get('engagementId'));
  const role = String(form.get('role')) as SignatoryRole;
  const name = formText(form, 'name');
  const phone = normalisePhone(formText(form, 'phone'));
  const email = formText(form, 'email');
  const poa = uploadedFile(form, 'poa');

  if (!SIGNATORY_ROLES.includes(role)) return { error: 'Choose a role.' };
  if (!name) return { error: 'Enter the signatory’s name.' };
  if (!phone) return { error: 'Enter a valid phone number.' };
  if (!phone.startsWith('+94') && !email) return { error: 'Signatories abroad need an email for their code.' };
  if (role === 'poa_holder' && !poa) return { error: 'Upload the power of attorney document.' };
  if (poa && poa.size > MAX_UPLOAD_BYTES) return { error: 'The document is larger than 20 MB.' };

  let poaStorageKey: string | null = null;
  if (poa) {
    poaStorageKey = `poa/${engagementId}/${randomUUID()}-${poa.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    await putPrivate(poaStorageKey, Buffer.from(await poa.arrayBuffer()));
  }
  await db.insert(signatories).values({ engagementId, role, name, phone, email, poaStorageKey });
  revalidatePath(`/studio/engagements/${engagementId}`);
  return { ok: true };
}

export async function removeSignatory(id: string, engagementId: string): Promise<void> {
  await requireStaff();
  const [s] = await db.select().from(signatories).where(eq(signatories.id, id));
  if (s && !s.signedAt) await db.delete(signatories).where(eq(signatories.id, id));
  revalidatePath(`/studio/engagements/${engagementId}`);
}

export async function signingLink(signatoryId: string): Promise<{ url: string; whatsapp: string }> {
  await requireStaff();
  const [s] = await db.select().from(signatories).where(eq(signatories.id, signatoryId));
  if (!s) throw new Error('Signatory not found');
  const url = `${config.appUrl}${signPath(`/sign/${s.id}`, LINK_TTL_SECONDS)}`;
  const text = `Hello ${s.name}, here is your Vikkaa agreement to review and sign. The link works for 7 days: ${url}`;
  return { url, whatsapp: whatsappLink(s.phone, text) };
}

export async function uploadPaperScan(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const engagementId = String(form.get('engagementId'));
  const scan = uploadedFile(form, 'scan');
  if (!scan) return { error: 'Choose the scanned agreement.' };
  if (scan.size > MAX_UPLOAD_BYTES) return { error: 'The scan is larger than 20 MB.' };
  await signWithPaperScan(engagementId, Buffer.from(await scan.arrayBuffer()), scan.name);
  revalidatePath(`/studio/engagements/${engagementId}`);
  return { ok: true };
}
