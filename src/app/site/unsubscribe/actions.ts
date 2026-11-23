'use server';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { verifySignedPath } from '@/lib/signed-url';
import { withdrawAll } from '@/server/consent';

/** One click from an email: every non-transactional message to that address stops. The link's signature is checked again here. */
export async function confirmUnsubscribe(form: FormData): Promise<void> {
  const id = String(form.get('id') ?? '');
  const exp = String(form.get('exp') ?? '');
  const sig = String(form.get('sig') ?? '');
  const path = `/unsubscribe/${id}`;
  if (verifySignedPath(path, new URLSearchParams({ exp, sig })) === 'invalid') redirect(`${path}?invalid=1`);
  const [m] = await db.select({ to: messages.toAddress }).from(messages).where(eq(messages.id, id));
  if (m?.to) await withdrawAll(m.to, 'unsubscribe_link', undefined, { messageId: id });
  redirect(`${path}?exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}&done=1`);
}
