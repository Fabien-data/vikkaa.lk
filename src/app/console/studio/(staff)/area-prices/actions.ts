'use server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { areaPrices } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { formCents, formText, FormError, type ActionResult } from '@/lib/form';

const KINDS = ['land_perch', 'house', 'apartment', 'vehicle'] as const;

export async function saveAreaPrice(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  try {
    const kind = String(form.get('kind')) as (typeof KINDS)[number];
    if (!KINDS.includes(kind)) throw new FormError('Choose a kind');
    const lowCents = formCents(form, 'lowRupees', 'Low');
    const highCents = formCents(form, 'highRupees', 'High');
    if (!lowCents || !highCents || lowCents > highCents) throw new FormError('Enter a low and high price, low first');
    const source = formText(form, 'source');
    if (!source) throw new FormError('Say where the figure comes from');
    const yearText = formText(form, 'year');
    const year = yearText ? Number(yearText) : null;
    if (kind === 'vehicle' && (!formText(form, 'make') || !formText(form, 'model') || !year)) {
      throw new FormError('Vehicles need make, model and year');
    }
    if (kind !== 'vehicle' && !formText(form, 'district') && !formText(form, 'area')) {
      throw new FormError('Enter a district or an area');
    }
    await db.insert(areaPrices).values({
      kind,
      district: formText(form, 'district'),
      area: formText(form, 'area'),
      make: formText(form, 'make'),
      model: formText(form, 'model'),
      year,
      lowCents,
      highCents,
      source,
    });
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    throw err;
  }
  revalidatePath('/studio/area-prices');
  return { ok: true };
}

export async function deleteAreaPrice(id: string): Promise<void> {
  await requireStaff();
  await db.delete(areaPrices).where(eq(areaPrices.id, id));
  revalidatePath('/studio/area-prices');
}
