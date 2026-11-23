import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { contentDrafts } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { isReadyToGoLive } from '@/server/content-approval';
import { addContentDraftToListing, submitContentDraft, withdrawContentDraft } from '../actions';

export const DRAFT_KIND_TEXT = { photo_set: 'Photo set', video: 'Video', reel: 'Reel' } as const;
const STATUS_TEXT = { pending: 'Waiting for the client', approved: 'Approved', changes_requested: 'Changes requested', withdrawn: 'Withdrawn' } as const;

export async function ContentSection({ assetId }: { assetId: string }) {
  const [drafts, ready] = await Promise.all([
    db.select().from(contentDrafts).where(eq(contentDrafts.assetId, assetId)).orderBy(desc(contentDrafts.createdAt)),
    isReadyToGoLive(assetId),
  ]);

  return (
    <section className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Content for client approval</h2>
        <span className={`text-sm ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
          {ready ? 'Clear to go live' : 'Waiting on client approval before going live'}
        </span>
      </div>
      <ul className="mb-4 grid gap-3 text-sm">
        {drafts.map((d) => {
          async function withdraw() {
            'use server';
            await withdrawContentDraft(assetId, d.id);
          }
          async function addToListing() {
            'use server';
            await addContentDraftToListing(assetId, d.id);
          }
          return (
            <li key={d.id} className={`grid gap-2 border-t pt-3 ${d.status === 'withdrawn' ? 'opacity-50' : ''}`}>
              <p>
                <span className="font-medium">{DRAFT_KIND_TEXT[d.kind]}</span> ·{' '}
                <span className={d.status === 'changes_requested' ? 'text-destructive' : 'text-muted-foreground'}>{STATUS_TEXT[d.status]}</span>
                {d.note && <span className="text-muted-foreground"> · {d.note}</span>}
              </p>
              {d.clientComment && <p className="rounded bg-muted p-2">Client: {d.clientComment}</p>}
              {d.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {d.files.map((f) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={f.src} src={f.src} srcSet={f.srcSet} sizes="96px" alt="" className="h-16 w-24 rounded object-cover" />
                  ))}
                </div>
              )}
              {d.youtubeUrl && (
                <a href={d.youtubeUrl} target="_blank" rel="noreferrer" className="underline">
                  {d.youtubeUrl}
                </a>
              )}
              <div className="flex gap-4 text-xs">
                {d.status === 'approved' && (
                  <form action={addToListing}>
                    <button className="underline">{d.kind === 'photo_set' ? 'Add these photos to the listing' : 'Use as the listing video'}</button>
                  </form>
                )}
                {d.status !== 'withdrawn' && d.status !== 'approved' && (
                  <form action={withdraw}>
                    <button className="text-muted-foreground underline">Withdraw (client dropped it or never answered)</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
        {drafts.length === 0 && <li className="text-muted-foreground">Nothing sent yet. The client sees drafts in their portal.</li>}
      </ul>
      <ActionForm action={submitContentDraft} submitLabel="Send to client" encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <input type="hidden" name="assetId" value={assetId} />
        <Field label="What">
          <select name="kind" className={inputClass}>
            {Object.entries(DRAFT_KIND_TEXT).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Photos (photo set)">
          <input type="file" name="photos" accept="image/*" multiple className="text-sm" />
        </Field>
        <Field label="YouTube link (video or reel)" hint="Upload as unlisted on YouTube, then paste the link">
          <input name="youtubeUrl" placeholder="https://youtu.be/…" className={inputClass} />
        </Field>
        <Field label="Note for the client">
          <input name="note" placeholder="First edit, colour graded" className={inputClass} />
        </Field>
      </ActionForm>
    </section>
  );
}
