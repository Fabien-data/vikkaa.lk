import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { user, clients, engagements, assets, buyers, notes } from '@/db/schema';
import { addNote, editNote, notesFor, addTask, setTaskDone, myOpenTasks, tasksFor, NoteError, type Subject } from '@/server/notes-tasks';

const session = { userId: '' };
vi.mock('@/server/auth-guard', () => ({ requireStaff: async () => ({ userId: session.userId, organizationId: 'org_vikkaa' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
const { saveNote, saveTask } = await import('@/app/console/studio/(staff)/records-actions');
const form = (o: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

async function staff(name: string) {
  const [u] = await db.insert(user).values({ id: crypto.randomUUID(), name, email: `${name.toLowerCase()}-${crypto.randomUUID()}@vikkaa.test` }).returning();
  return u.id;
}
async function seedSubjects(): Promise<Subject[]> {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Perera', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({ engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 100 })
    .returning();
  const [b] = await db.insert(buyers).values({ phone: `+9471${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  return [
    { type: 'client', id: c.id },
    { type: 'engagement', id: e.id },
    { type: 'asset', id: a.id },
    { type: 'buyer', id: b.id },
  ];
}
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

describe('notes and tasks', () => {
  it('note attaches to each subject type', async () => {
    const me = await staff('Tiran');
    const subjects = await seedSubjects();
    for (const s of subjects) await addNote(s, `  about the ${s.type}  `, me);
    for (const s of subjects) {
      const list = await notesFor(s);
      expect(list.map((n) => n.body)).toEqual([`about the ${s.type}`]);
      expect(list[0].authorName).toBe('Tiran');
    }
    await expect(addNote(subjects[0], '   ', me)).rejects.toBeInstanceOf(NoteError);
  });

  it('only author edits within 15 minutes', async () => {
    const me = await staff('Tiran');
    const partner = await staff('Partner');
    const [client] = await seedSubjects();
    const note = await addNote(client, 'first', me);

    await expect(editNote(note.id, 'hijack', partner)).rejects.toThrow(/only the person who wrote/i);
    await editNote(note.id, 'fixed typo', me);
    expect(await notesFor(client)).toMatchObject([{ body: 'fixed typo', editable: true }]);

    await db.update(notes).set({ createdAt: new Date(Date.now() - 16 * 60_000) }).where(eq(notes.id, note.id));
    await expect(editNote(note.id, 'too late', me)).rejects.toThrow(/15 minutes/);
    expect(await notesFor(client)).toMatchObject([{ body: 'fixed typo', editable: false }]);
  });

  it('overdue tasks first', async () => {
    const me = await staff('Tiran');
    const partner = await staff('Partner');
    const [client, engagement] = await seedSubjects();
    await addTask(client, { title: 'no date', assignedUserId: me });
    await addTask(client, { title: 'next week', dueAt: hoursFromNow(24 * 7), assignedUserId: me });
    await addTask(engagement, { title: 'overdue 2 days', dueAt: hoursFromNow(-48), assignedUserId: me });
    await addTask(engagement, { title: 'tomorrow, unassigned', dueAt: hoursFromNow(24) });
    await addTask(engagement, { title: 'overdue 1 hour', dueAt: hoursFromNow(-1), assignedUserId: me });
    await addTask(client, { title: "partner's", dueAt: hoursFromNow(-72), assignedUserId: partner });
    const done = await addTask(client, { title: 'done already', dueAt: hoursFromNow(-96), assignedUserId: me });
    await setTaskDone(done.id, true);

    const mine = await myOpenTasks(me);
    expect(mine.map((t) => t.title)).toEqual(['overdue 2 days', 'overdue 1 hour', 'tomorrow, unassigned', 'next week', 'no date']);
    expect(mine.filter((t) => t.overdue).map((t) => t.title)).toEqual(['overdue 2 days', 'overdue 1 hour']);
  });

  it('forms: a note is signed by the signed-in staff member, a due date means the end of that Sri Lanka day', async () => {
    session.userId = await staff('Tiran');
    const [, , asset] = await seedSubjects();
    const subject = { subjectType: 'asset', subjectId: asset.id };
    expect(await saveNote(undefined, form({ ...subject, body: 'Owner wants Sunday viewings' }))).toEqual({ ok: true });
    expect((await notesFor(asset))[0]).toMatchObject({ authorName: 'Tiran', body: 'Owner wants Sunday viewings' });

    expect(await saveTask(undefined, form({ ...subject, title: 'Book drone permit', dueOn: '2026-12-02', assignedUserId: '' }))).toEqual({ ok: true });
    const [task] = await tasksFor(asset);
    expect(task.dueAt?.toISOString()).toBe('2026-12-02T18:29:59.000Z');
    expect(task.assignedUserId).toBeNull();

    expect((await saveTask(undefined, form({ ...subject, title: '  ' })))?.error).toMatch(/title/);
    await expect(saveNote(undefined, form({ subjectType: 'user', subjectId: 'x', body: 'hi' }))).rejects.toThrow(/Unknown record type/);
  });
});
