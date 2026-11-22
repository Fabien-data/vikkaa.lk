import { requireStaff } from '@/server/auth-guard';
import { notesFor, type Subject } from '@/server/notes-tasks';
import { ActionForm } from '@/components/studio/ActionForm';
import { inputClass } from '@/components/studio/Field';
import { saveNote, updateNote } from '@/app/console/studio/(staff)/records-actions';

const stamp = (d: Date) =>
  d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export async function NotesPanel({ subject }: { subject: Subject }) {
  const { userId } = await requireStaff();
  const rows = await notesFor(subject);
  const hidden = (
    <>
      <input type="hidden" name="subjectType" value={subject.type} />
      <input type="hidden" name="subjectId" value={subject.id} />
    </>
  );

  return (
    <section className="rounded-md border bg-background p-5">
      <h2 className="mb-3 font-semibold">Notes</h2>
      <ActionForm action={saveNote} submitLabel="Add note" className="mb-4 grid gap-2">
        {hidden}
        <textarea name="body" rows={2} placeholder="What happened, what was agreed" className={inputClass} />
      </ActionForm>
      <ul className="grid gap-3 text-sm">
        {rows.map((n) => (
          <li key={n.id} className="border-t pt-3">
            <p className="mb-1 text-xs text-muted-foreground">
              {n.authorName} · {stamp(n.createdAt)}
              {n.updatedAt.getTime() - n.createdAt.getTime() > 1000 && ' · edited'}
            </p>
            <p className="whitespace-pre-line">{n.body}</p>
            {n.userId === userId && n.editable && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs underline">Edit (for 15 minutes after writing)</summary>
                <ActionForm action={updateNote} submitLabel="Save edit" className="mt-2 grid gap-2">
                  {hidden}
                  <input type="hidden" name="noteId" value={n.id} />
                  <textarea name="body" rows={2} defaultValue={n.body} className={inputClass} />
                </ActionForm>
              </details>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="text-muted-foreground">No notes yet.</li>}
      </ul>
    </section>
  );
}
