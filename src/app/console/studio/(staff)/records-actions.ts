'use server';
import { revalidatePath } from 'next/cache';
import { subjectType } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { addNote, addTask, editNote, setTaskDone, subjectPath, NoteError, type Subject } from '@/server/notes-tasks';
import { formText, FormError, type ActionResult } from '@/lib/form';

function subjectFrom(form: FormData): Subject {
  const type = String(form.get('subjectType')) as Subject['type'];
  if (!subjectType.enumValues.includes(type)) throw new Error('Unknown record type');
  return { type, id: String(form.get('subjectId')) };
}

async function guard(subject: Subject, work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work();
  } catch (err) {
    if (err instanceof NoteError || err instanceof FormError) return { error: err.message };
    throw err;
  }
  revalidatePath(subjectPath(subject));
  revalidatePath('/studio');
  return { ok: true };
}

export async function saveNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const subject = subjectFrom(form);
  return guard(subject, () => addNote(subject, String(form.get('body') ?? ''), userId));
}

export async function updateNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { userId } = await requireStaff();
  const subject = subjectFrom(form);
  return guard(subject, () => editNote(String(form.get('noteId')), String(form.get('body') ?? ''), userId));
}

export async function saveTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireStaff();
  const subject = subjectFrom(form);
  return guard(subject, async () => {
    const due = formText(form, 'dueOn');
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new FormError('Due: pick a date');
    await addTask(subject, {
      title: String(form.get('title') ?? ''),
      // Due at the end of that day in Sri Lanka, so a task is overdue only once its day has passed.
      dueAt: due ? new Date(`${due}T23:59:59+05:30`) : null,
      assignedUserId: formText(form, 'assignedUserId'),
    });
  });
}

export async function toggleTask(taskId: string, done: boolean): Promise<void> {
  await requireStaff();
  const task = await setTaskDone(taskId, done);
  if (task) revalidatePath(subjectPath({ type: task.subjectType, id: task.subjectId }));
  revalidatePath('/studio');
}
