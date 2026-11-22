import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { notes, tasks, user, type Note, type SubjectType, type Task } from '@/db/schema';

export type Subject = { type: SubjectType; id: string };

/** A user-facing problem with a note or task, shown in the Studio form. */
export class NoteError extends Error {}

const EDIT_WINDOW = sql`interval '15 minutes'`;
const ofSubject = (table: typeof notes | typeof tasks, s: Subject) => and(eq(table.subjectType, s.type), eq(table.subjectId, s.id));

/** The Studio page a subject lives on: /studio/clients/:id, /studio/assets/:id, ... */
export const subjectPath = (s: Subject) => `/studio/${s.type}s/${s.id}`;

export async function addNote(subject: Subject, body: string, userId: string): Promise<Note> {
  const text = body.trim();
  if (!text) throw new NoteError('Write something first');
  const [note] = await db.insert(notes).values({ subjectType: subject.type, subjectId: subject.id, userId, body: text }).returning();
  return note;
}

/** Only the author may edit, and only within 15 minutes of writing (checked against the database clock). */
export async function editNote(noteId: string, body: string, userId: string): Promise<Note> {
  const text = body.trim();
  if (!text) throw new NoteError('A note cannot be empty');
  const [updated] = await db
    .update(notes)
    .set({ body: text })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), sql`${notes.createdAt} > now() - ${EDIT_WINDOW}`))
    .returning();
  if (updated) return updated;
  const [existing] = await db.select().from(notes).where(eq(notes.id, noteId));
  if (!existing) throw new NoteError('That note no longer exists');
  if (existing.userId !== userId) throw new NoteError('Only the person who wrote a note can edit it');
  throw new NoteError('Notes can only be edited for 15 minutes after writing. Add a new note instead.');
}

export async function notesFor(subject: Subject) {
  return db
    .select({ id: notes.id, body: notes.body, userId: notes.userId, authorName: user.name, createdAt: notes.createdAt, updatedAt: notes.updatedAt, editable: sql<boolean>`${notes.createdAt} > now() - ${EDIT_WINDOW}` })
    .from(notes)
    .innerJoin(user, eq(notes.userId, user.id))
    .where(ofSubject(notes, subject))
    .orderBy(desc(notes.createdAt));
}

export async function addTask(subject: Subject, input: { title: string; dueAt?: Date | null; assignedUserId?: string | null }): Promise<Task> {
  const title = input.title.trim();
  if (!title) throw new NoteError('Give the task a title');
  const [task] = await db
    .insert(tasks)
    .values({ subjectType: subject.type, subjectId: subject.id, title, dueAt: input.dueAt ?? null, assignedUserId: input.assignedUserId ?? null })
    .returning();
  return task;
}

export async function setTaskDone(taskId: string, done: boolean): Promise<Task | undefined> {
  const [task] = await db
    .update(tasks)
    .set({ doneAt: done ? new Date() : null })
    .where(eq(tasks.id, taskId))
    .returning();
  return task;
}

const taskColumns = {
  id: tasks.id,
  subjectType: tasks.subjectType,
  subjectId: tasks.subjectId,
  title: tasks.title,
  dueAt: tasks.dueAt,
  assignedUserId: tasks.assignedUserId,
  doneAt: tasks.doneAt,
  overdue: sql<boolean>`(${tasks.doneAt} is null and coalesce(${tasks.dueAt} < now(), false))`,
};

const byDueDate = [sql`${tasks.dueAt} asc nulls last`, asc(tasks.createdAt)];

/** Open tasks on one record: overdue and soonest first, undated last; finished ones after. */
export async function tasksFor(subject: Subject) {
  return db
    .select({ ...taskColumns, assigneeName: user.name })
    .from(tasks)
    .leftJoin(user, eq(tasks.assignedUserId, user.id))
    .where(ofSubject(tasks, subject))
    .orderBy(sql`${tasks.doneAt} is not null`, ...byDueDate);
}

/** Open tasks assigned to this person or to nobody (a team of two shares unassigned work): overdue first, then by due date. */
export async function myOpenTasks(userId: string) {
  return db
    .select(taskColumns)
    .from(tasks)
    .where(and(isNull(tasks.doneAt), or(eq(tasks.assignedUserId, userId), isNull(tasks.assignedUserId))))
    .orderBy(...byDueDate);
}
