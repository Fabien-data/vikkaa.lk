'use server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { upsertBuyerByPhone } from '@/server/buyers';
import { appendEvidence } from '@/server/evidence-log';
import { normalisePhone } from '@/lib/phone';
import { isValidIdNumber } from '@/lib/id-number';
import { formText, type ActionResult } from '@/lib/form';

/** A buyer checks in on staff's phone at a viewing or test drive, confirming Vikkaa introduced them. */
export async function submitCheckin(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const [asset] = await db.select().from(assets).where(eq(assets.id, String(form.get('assetId'))));
  if (!asset) return { error: 'Asset not found.' };

  const name = formText(form, 'name');
  const phone = normalisePhone(formText(form, 'phone'));
  const nic = formText(form, 'nic');
  if (!name) return { error: 'Enter your name.' };
  if (!phone) return { error: 'Enter a valid phone number.' };
  if (!nic || !isValidIdNumber(nic)) return { error: 'Enter a valid NIC or passport number.' };
  if (form.get('confirmIntroduced') !== 'on') return { error: 'Please confirm that Vikkaa introduced you.' };

  const buyer = await upsertBuyerByPhone(phone, { name, nic: nic.toUpperCase(), source: 'viewing' });
  await appendEvidence({
    assetId: asset.id,
    buyerId: buyer.id,
    type: asset.category === 'vehicle' ? 'test_drive' : 'viewing',
    channel: 'in_person',
    happenedAt: new Date(),
    data: { checkin: true, confirmedIntroduced: true },
    recordedByUserId: userId,
  });
  return { ok: true };
}
