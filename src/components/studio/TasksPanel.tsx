import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/schema';
import { subjectPath, tasksFor, type Subject } from '@/server/notes-tasks';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { saveTask, toggleTask } from '@/app/console/studio/(staff)/records-actions';

const dueText = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: 'numeric', month: 'short' });

type TaskLike = { id: string; title: string; dueAt: Date | null; doneAt: Date | null; overdue: boolean; subjectType: Subject['type']; subjectId: string };

/** One task with its done toggle. `showSubject` links to the record (used on the Studio home). */
export function TaskRow({ task, assignee, showSubject }: { task: TaskLike; assignee?: string | null; showSubject?: boolean }) {
  async function toggle() {
    'use server';
    await toggleTask(task.id, !task.doneAt);
  }
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <form action={toggle}>
        <button
          aria-label={task.doneAt ? `Reopen: ${task.title}` : `Mark done: ${task.title}`}
          className={`flex size-5 items-center justify-center rounded border ${task.doneAt ? 'bg-foreground text-background' : ''}`}
        >
          {task.doneAt ? '✓' : ''}
        </button>
      </form>
      <span className={task.doneAt ? 'text-muted-foreground line-through' : ''}>{task.title}</span>
      {task.dueAt && <span className={task.overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>{task.overdue ? 'Overdue: ' : 'Due '}{dueText(task.dueAt)}</span>}
      {assignee && <span className="text-muted-foreground">{assignee}</span>}
      {showSubject && (
        <Link href={subjectPath({ type: task.subjectType, id: task.subjectId })} className="text-muted-foreground underline">
          Open {task.subjectType}
        </Link>
      )}
    </li>
  );
}

export async function TasksPanel({ subject }: { subject: Subject }) {
  const [rows, staff] = await Promise.all([tasksFor(subject), db.select({ id: user.id, name: user.name }).from(user).orderBy(asc(user.name))]);

  return (
    <section className="rounded-md border bg-background p-5">
      <h2 className="mb-3 font-semibold">Tasks</h2>
      <ul className="mb-4 grid gap-2 text-sm">
        {rows.map((t) => (
          <TaskRow key={t.id} task={t} assignee={t.assigneeName} />
        ))}
        {rows.length === 0 && <li className="text-muted-foreground">No tasks yet.</li>}
      </ul>
      <ActionForm action={saveTask} submitLabel="Add task" className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <input type="hidden" name="subjectType" value={subject.type} />
        <input type="hidden" name="subjectId" value={subject.id} />
        <Field label="Task">
          <input name="title" placeholder="Call back about the deeds" className={inputClass} />
        </Field>
        <Field label="Due">
          <input name="dueOn" type="date" className={inputClass} />
        </Field>
        <Field label="For">
          <select name="assignedUserId" defaultValue="" className={inputClass}>
            <option value="">Either of us</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </ActionForm>
    </section>
  );
}
