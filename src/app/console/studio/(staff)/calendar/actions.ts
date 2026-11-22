'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, bookings } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { addBooking, sriLankaDay } from '@/server/bookings';
import { formInt, formText, sriLankaTime, FormError, type ActionResult } from '@/lib/form';

const timeText = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' });

export async function saveBooking(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const engagementId = String(form.get('engagementId'));
  try {
    const type = String(form.get('type'));
    if (type !== 'visit' && type !== 'shoot') throw new FormError('Choose a visit or a shoot');
    const when = formText(form, 'startsAt');
    if (!when) throw new FormError('Enter the date and time');
    const assetId = formText(form, 'assetId');
    const [asset] = assetId ? await db.select().from(assets).where(eq(assets.id, assetId)) : [];
    if (assetId && asset?.engagementId !== engagementId) throw new FormError('That asset is not part of this engagement');
    const area = formText(form, 'area') ?? asset?.area;
    if (!area) throw new FormError('Area: enter where this is, e.g. Nugegoda');

    const { overlaps } = await addBooking({
      engagementId,
      assetId,
      type,
      startsAt: sriLankaTime(when),
      durationMinutes: formInt(form, 'durationMinutes', 'Duration (minutes)', 15, 720),
      area,
      notes: formText(form, 'notes'),
    });
    revalidatePath(`/studio/engagements/${engagementId}`);
    revalidatePath('/studio/calendar');
    if (overlaps.length) {
      const list = overlaps.map((b) => `${b.type} in ${b.area} on ${sriLankaDay(b.startsAt)} at ${timeText(b.startsAt)}`).join('; ');
      return { ok: true, warning: `Saved, but it overlaps: ${list}` };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    throw err;
  }
}

export async function deleteBooking(id: string): Promise<void> {
  await requireStaff();
  const [b] = await db.delete(bookings).where(eq(bookings.id, id)).returning();
  if (b) revalidatePath(`/studio/engagements/${b.engagementId}`);
  revalidatePath('/studio/calendar');
}
