import { requireStaff } from '@/server/auth-guard';
import { myOpenTasks } from '@/server/notes-tasks';
import { TaskRow } from '@/components/studio/TasksPanel';

export default async function StudioHome() {
  const { userId } = await requireStaff();
  const tasks = await myOpenTasks(userId);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Welcome to Vikkaa Studio</h1>
      <section className="max-w-2xl rounded-md border bg-background p-5">
        <h2 className="mb-3 font-semibold">My open tasks</h2>
        <ul className="grid gap-2 text-sm">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} showSubject />
          ))}
          {tasks.length === 0 && <li className="text-muted-foreground">Nothing open. Tasks for you or for either of you show here.</li>}
        </ul>
      </section>
    </div>
  );
}
