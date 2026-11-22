import { ActionForm } from '@/components/studio/ActionForm';
import { inputClass } from '@/components/studio/Field';
import type { ContentDraft, Photo } from '@/db/schema';
import { answerDraft } from './actions';

type Draft = {
  id: string;
  kind: 'photo_set' | 'video' | 'reel';
  files: Photo[];
  embed: string | null;
  note: string | null;
  status: ContentDraft['status'];
  clientComment: string | null;
};

const KIND_TEXT = { photo_set: 'Photos', video: 'Video', reel: 'Reel' } as const;

export function Drafts({ drafts }: { drafts: Draft[] }) {
  if (!drafts.length) return null;
  return (
    <div className="mt-4 grid gap-4 border-t pt-4">
      <h3 className="text-sm font-semibold">Content for your approval</h3>
      {drafts.map((d) =>
        d.status === 'pending' ? (
          <div key={d.id} className="grid gap-3 rounded-md border bg-background p-3">
            <p className="text-sm">
              <span className="font-semibold">{KIND_TEXT[d.kind]}</span>
              {d.note && <span className="text-muted-foreground"> · {d.note}</span>}
            </p>
            {d.files.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {d.files.map((f, i) => (
                  <a key={f.src} href={f.src} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.src} srcSet={f.srcSet} sizes="(min-width: 640px) 240px, 50vw" alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full rounded object-cover" />
                  </a>
                ))}
              </div>
            )}
            {d.embed && (
              <iframe
                src={d.embed}
                title={KIND_TEXT[d.kind]}
                className={`w-full rounded ${d.kind === 'reel' ? 'mx-auto aspect-[9/16] max-w-xs' : 'aspect-video'}`}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            <ActionForm action={answerDraft} submitLabel="Approve" className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="draftId" value={d.id} />
              <input type="hidden" name="decision" value="approved" />
            </ActionForm>
            <details>
              <summary className="cursor-pointer text-sm underline">Ask for changes</summary>
              <ActionForm action={answerDraft} submitLabel="Send" className="mt-2 grid gap-2">
                <input type="hidden" name="draftId" value={d.id} />
                <input type="hidden" name="decision" value="changes_requested" />
                <textarea name="comment" rows={2} placeholder="What would you like changed?" className={inputClass} />
              </ActionForm>
            </details>
          </div>
        ) : (
          <p key={d.id} className="text-sm text-muted-foreground">
            {KIND_TEXT[d.kind]}: {d.status === 'approved' ? 'approved, thank you' : `you asked for changes ("${d.clientComment}"). We’ll send a new version.`}
          </p>
        ),
      )}
    </div>
  );
}
