'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, type Asset } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { putPublicImage } from '@/server/storage';
import { ASSET_KINDS, kindCategory, type AssetKind } from '@/lib/enums';
import { DISTRICTS } from '@/lib/rules';
import { slugFor } from '@/lib/slug';
import { formCents, formOptionalCents, formText, FormError, type ActionResult } from '@/lib/form';

const DETAIL_FIELDS = {
  property: ['bedrooms', 'bathrooms', 'landPerches', 'floorAreaSqft'],
  vehicle: ['make', 'model', 'year', 'mileageKm', 'fuel', 'transmission'],
} as const;
const TEXT_DETAILS = new Set(['make', 'model', 'fuel', 'transmission']);
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function readDetails(form: FormData, category: 'property' | 'vehicle'): Asset['details'] {
  const details: Asset['details'] = {};
  for (const field of DETAIL_FIELDS[category]) {
    const raw = formText(form, `details.${field}`);
    if (!raw) continue;
    if (TEXT_DETAILS.has(field)) details[field] = raw;
    else {
      const n = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0) throw new FormError(`${field}: enter a number`);
      details[field] = n;
    }
  }
  return details;
}

export async function saveAsset(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const id = formText(form, 'id');
  let createdId: string | null = null;
  try {
    const kind = String(form.get('kind')) as AssetKind;
    if (!ASSET_KINDS.includes(kind)) throw new FormError('Choose a type');
    const category = kindCategory(kind);
    const title = formText(form, 'title');
    const district = formText(form, 'district');
    const area = formText(form, 'area');
    if (!title) throw new FormError('Enter a title');
    if (!district || !(DISTRICTS as readonly string[]).includes(district)) throw new FormError('Choose a district');
    if (!area) throw new FormError('Enter the town or area');
    const youtubeUrl = formText(form, 'youtubeUrl');
    if (youtubeUrl && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtubeUrl)) {
      throw new FormError('YouTube link must start with https://www.youtube.com/ or https://youtu.be/');
    }
    const values = {
      kind,
      category,
      title,
      district,
      area,
      address: formText(form, 'address'),
      description: formText(form, 'description'),
      youtubeUrl,
      askingPriceCents: formCents(form, 'askingPriceRupees', 'Asking price'),
      recommendedPriceCents: formOptionalCents(form, 'recommendedPriceRupees', 'Recommended price'),
      details: readDetails(form, category),
    };
    if (id) {
      await db.update(assets).set(values).where(eq(assets.id, id));
    } else {
      const engagementId = formText(form, 'engagementId');
      if (!engagementId) throw new FormError('Missing engagement');
      const [created] = await db.insert(assets).values({ ...values, engagementId, slug: slugFor(title) }).returning();
      createdId = created.id;
    }
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    throw err;
  }
  if (createdId) redirect(`/studio/assets/${createdId}`);
  revalidatePath(`/studio/assets/${id}`);
  return { ok: true };
}

export async function uploadAssetPhotos(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const assetId = String(form.get('assetId'));
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: 'Choose at least one photo' };
  for (const f of files) {
    if (!f.type.startsWith('image/')) return { error: `${f.name} is not an image` };
    if (f.size > MAX_PHOTO_BYTES) return { error: `${f.name} is larger than 15 MB` };
  }
  const [asset] = await db.select({ photos: assets.photos }).from(assets).where(eq(assets.id, assetId));
  if (!asset) return { error: 'Asset not found' };
  const added = [];
  for (const f of files) {
    added.push(await putPublicImage(`assets/${assetId}/${randomUUID()}`, Buffer.from(await f.arrayBuffer())));
  }
  await db.update(assets).set({ photos: [...asset.photos, ...added] }).where(eq(assets.id, assetId));
  revalidatePath(`/studio/assets/${assetId}`);
  return { ok: true };
}

export async function movePhoto(assetId: string, index: number, direction: -1 | 1): Promise<void> {
  await requireStaff();
  const [asset] = await db.select({ photos: assets.photos }).from(assets).where(eq(assets.id, assetId));
  const photos = [...(asset?.photos ?? [])];
  const target = index + direction;
  if (target < 0 || target >= photos.length) return;
  [photos[index], photos[target]] = [photos[target], photos[index]];
  await db.update(assets).set({ photos }).where(eq(assets.id, assetId));
  revalidatePath(`/studio/assets/${assetId}`);
}

export async function removePhoto(assetId: string, index: number): Promise<void> {
  await requireStaff();
  const [asset] = await db.select({ photos: assets.photos }).from(assets).where(eq(assets.id, assetId));
  const photos = (asset?.photos ?? []).filter((_, i) => i !== index);
  await db.update(assets).set({ photos }).where(eq(assets.id, assetId));
  revalidatePath(`/studio/assets/${assetId}`);
}
