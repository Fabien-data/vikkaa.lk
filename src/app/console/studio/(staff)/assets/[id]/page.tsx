import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { statusLabel } from '@/lib/enums';
import { AssetFields } from '../asset-fields';
import { Field, inputClass } from '@/components/studio/Field';
import { changeAssetStatus, movePhoto, removePhoto, saveAsset, uploadAssetPhotos } from '../actions';

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [asset] = await db.select().from(assets).where(eq(assets.id, id));
  if (!asset) notFound();

  return (
    <div className="grid max-w-4xl gap-6">
      <Link href={`/studio/engagements/${asset.engagementId}`} className="text-sm text-muted-foreground">
        Back to engagement
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{asset.title}</h1>
        <span className="rounded bg-muted px-2 py-0.5 text-sm">{statusLabel(asset.status)}</span>
      </div>

      <section className="rounded-md border bg-background p-5">
        <ActionForm action={saveAsset} submitLabel="Save asset">
          <AssetFields asset={asset} />
        </ActionForm>
      </section>

      <section id="status" className="rounded-md border bg-background p-5">
        <h2 className="mb-3 font-semibold">Status</h2>
        <ActionForm action={changeAssetStatus} submitLabel="Change status" className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <input type="hidden" name="assetId" value={asset.id} />
          <Field label="Move to">
            <select name="status" className={inputClass} defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {(['live', 'under_offer', 'sold', 'expired', 'withdrawn'] as const).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sold price (Rs)" hint="Only when marking sold">
            <input name="soldPriceRupees" className={inputClass} />
          </Field>
        </ActionForm>
      </section>

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-3 font-semibold">Photos ({asset.photos.length})</h2>
        <ol className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {asset.photos.map((p, i) => {
            async function up() {
              'use server';
              await movePhoto(id, i, -1);
            }
            async function down() {
              'use server';
              await movePhoto(id, i, 1);
            }
            async function remove() {
              'use server';
              await removePhoto(id, i);
            }
            return (
              <li key={p.src} className="grid gap-1 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} srcSet={p.srcSet} sizes="200px" alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full rounded object-cover" />
                <div className="flex gap-2">
                  <form action={up}>
                    <button disabled={i === 0} className="underline disabled:opacity-40">
                      Earlier
                    </button>
                  </form>
                  <form action={down}>
                    <button disabled={i === asset.photos.length - 1} className="underline disabled:opacity-40">
                      Later
                    </button>
                  </form>
                  <form action={remove}>
                    <button className="text-destructive underline">Remove</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ol>
        <ActionForm action={uploadAssetPhotos} submitLabel="Upload photos" encType="multipart/form-data">
          <input type="hidden" name="assetId" value={asset.id} />
          <input type="file" name="photos" accept="image/*" multiple className="text-sm" />
        </ActionForm>
      </section>
    </div>
  );
}
