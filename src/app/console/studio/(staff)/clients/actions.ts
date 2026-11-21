'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { normalisePhone } from '@/lib/phone';
import { CLIENT_TYPES, type ClientType } from '@/lib/enums';
import { formText, type ActionResult } from '@/lib/form';
import { signPath } from '@/lib/signed-url';
import { whatsappLink } from '@/lib/whatsapp';
import { config } from '@/lib/config';

export async function portalLink(clientId: string): Promise<{ url: string; whatsapp: string }> {
  await requireStaff();
  const [c] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!c) throw new Error('Client not found');
  const url = `${config.appUrl}${signPath(`/portal/login/${c.id}`, 7 * 86_400)}`;
  const text = `Hello ${c.name}, here is your Vikkaa portal. It shows your campaign, enquiries and documents. The link works for 7 days: ${url}`;
  return { url, whatsapp: whatsappLink(c.phone, text) };
}

export async function saveClient(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = formText(form, 'id');
  const name = formText(form, 'name');
  const phone = normalisePhone(formText(form, 'phone'));
  const type = String(form.get('type')) as ClientType;
  if (!name) return { error: 'Enter a name' };
  if (!phone) return { error: 'Enter a valid phone number' };
  if (!CLIENT_TYPES.includes(type)) return { error: 'Choose a client type' };
  const values = { name, phone, type, email: formText(form, 'email'), notes: formText(form, 'notes') };

  try {
    if (id) {
      await db.update(clients).set(values).where(eq(clients.id, id));
    } else {
      const [created] = await db.insert(clients).values(values).returning();
      redirect(`/studio/clients/${created.id}`);
    }
  } catch (err) {
    if (String((err as { cause?: { code?: string } })?.cause?.code ?? (err as { code?: string }).code) === '23505') {
      return { error: 'Another client already has this phone number' };
    }
    throw err;
  }
  revalidatePath(`/studio/clients/${id}`);
  return { ok: true };
}
