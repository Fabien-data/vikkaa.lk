import Link from 'next/link';
import { requireStaff } from '@/server/auth-guard';
import { myOpenTasks } from '@/server/notes-tasks';
import { todayQueue } from '@/server/prospects';
import { gates, pitchProgress, runway, warRoomExtras, weekNumbers, type Gate } from '@/server/war-room';
import { TaskRow } from '@/components/studio/TasksPanel';
import { ActionForm } from '@/components/studio/ActionForm';
import { SubmitButton } from '@/components/studio/SubmitButton';
import { formatLkr } from '@/lib/money';
import { callOutcome, sendDueBatch, skipDueStep, whatsappSent } from './prospects/actions';

const GATE_STYLE: Record<Gate['status'], string> = {
  met: 'border-emerald-300 bg-emerald-50',
  open: 'border-amber-300 bg-amber-50',
  missed: 'border-red-300 bg-red-50',
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function WarRoom() {
  const { userId } = await requireStaff();
  const now = new Date();
  const extras = await warRoomExtras(now);
  const [tasks, queue, week, pitches, gateList, run] = await Promise.all([
    myOpenTasks(userId),
    todayQueue(userId, now),
    weekNumbers(now),
    pitchProgress(),
    gates(now, extras),
    runway(now),
  ]);
  const emails = queue.filter((q) => q.step.channel === 'email' && q.email && !q.doNotContact);
  const whatsapps = queue.filter((q) => q.step.channel === 'whatsapp' && !q.doNotContact);
  const calls = queue.filter((q) => q.step.channel === 'call' && !q.doNotContact);
  const planB = gateList.find((g) => g.key === 'B')?.status === 'missed';

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">War room</h1>
        <Link href="/studio/prospects" className="text-sm underline">
          All prospects
        </Link>
      </div>

      {planB && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm">
          <strong>Gate B was missed.</strong> Trigger Plan B now: change the offer or price, and agree who takes part-time income while the other keeps selling.
        </p>
      )}

      <section aria-labelledby="today-h" className="grid gap-4 rounded-md border bg-background p-5">
        <h2 id="today-h" className="font-semibold">
          Today&rsquo;s outreach <span className="font-normal text-muted-foreground">({queue.length} due)</span>
        </h2>

        {emails.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Emails ({emails.length})</h3>
            <ActionForm action={sendDueBatch} submitLabel={`Send ticked emails`} className="grid gap-2">
              <ul className="grid gap-1 text-sm">
                {emails.map((q) => (
                  <li key={q.prospect.id}>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" name="prospectId" value={q.prospect.id} defaultChecked className="mt-1" />
                      <span>
                        <Link href={`/studio/prospects/${q.prospect.id}`} className="font-medium hover:underline">
                          {q.prospect.name}
                        </Link>{' '}
                        <span className="text-muted-foreground">· {q.email!.subject}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </ActionForm>
          </div>
        )}

        {whatsapps.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">WhatsApp ({whatsapps.length})</h3>
            <ul className="grid gap-2 text-sm">
              {whatsapps.map((q) => {
                async function sent() {
                  'use server';
                  await whatsappSent(q.prospect.id);
                }
                async function skip() {
                  'use server';
                  await skipDueStep(q.prospect.id);
                }
                return (
                  <li key={q.prospect.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/studio/prospects/${q.prospect.id}`} className="font-medium hover:underline">
                      {q.prospect.name}
                    </Link>
                    {q.whatsapp?.link ? (
                      <a href={q.whatsapp.link} target="_blank" rel="noopener noreferrer" className="rounded border px-2 py-1">
                        Open WhatsApp
                      </a>
                    ) : (
                      <span className="text-muted-foreground">no template</span>
                    )}
                    <form action={sent}>
                      <SubmitButton pendingText="Saving…">Sent ✓</SubmitButton>
                    </form>
                    <form action={skip}>
                      <SubmitButton plain className="text-muted-foreground">Skip</SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {calls.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Calls ({calls.length})</h3>
            <ul className="grid gap-2 text-sm">
              {calls.map((q) => (
                <li key={q.prospect.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/studio/prospects/${q.prospect.id}`} className="font-medium hover:underline">
                    {q.prospect.name}
                  </Link>
                  {q.prospect.phone && (
                    <a href={`tel:${q.prospect.phone}`} className="rounded border px-2 py-1">
                      Call
                    </a>
                  )}
                  {(['no_answer', 'talked', 'pitched'] as const).map((o) => {
                    async function log() {
                      'use server';
                      await callOutcome(q.prospect.id, o);
                    }
                    return (
                      <form key={o} action={log}>
                        <SubmitButton pendingText="Saving…">{o === 'no_answer' ? 'No answer' : o === 'talked' ? 'Talked' : 'Pitched'}</SubmitButton>
                      </form>
                    );
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {queue.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing due. <Link href="/studio/prospects" className="underline">Add prospects</Link> to start the day&rsquo;s outreach.
          </p>
        )}
      </section>

      <section aria-labelledby="week-h" className="grid gap-3">
        <h2 id="week-h" className="font-semibold">This week</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Prospects contacted" value={week.contacted} />
          <Stat label="Pitches" value={week.pitches} />
          <Stat label="Replied" value={week.replied} />
          <Stat label="Meetings" value={week.meetings} />
          <Stat label="Won" value={week.won} />
        </div>
        <div className="rounded-md border bg-background p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Pitches towards Gate A</span>
            <span className="tabular-nums">
              {pitches.done} / {pitches.target}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded bg-muted" role="progressbar" aria-label="Pitches towards Gate A" aria-valuemin={0} aria-valuemax={pitches.target} aria-valuenow={pitches.done}>
            <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, (pitches.done / pitches.target) * 100)}%` }} />
          </div>
        </div>
      </section>

      <section aria-labelledby="money-h" className="grid gap-3">
        <h2 id="money-h" className="font-semibold">Money</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Collected this month" value={formatLkr(extras.collectedThisMonthCents)} />
          <Stat label="Owed to us" value={formatLkr(extras.owedCents)} />
          <Stat label="Monthly recurring (retainers)" value={formatLkr(extras.mrrCents)} />
          <Stat
            label={run.stale ? 'Runway (update the cash figure in Settings)' : 'Months of runway'}
            value={run.months == null ? 'Set in Settings' : run.months.toFixed(1)}
          />
        </div>
        {extras.survival && (
          <p className="text-sm text-muted-foreground">
            Survival number: {extras.survival.needed} retainers cover both founders&rsquo; costs. Active now: {extras.survival.active}.
          </p>
        )}
      </section>

      <section aria-labelledby="gates-h" className="grid gap-3">
        <h2 id="gates-h" className="font-semibold">Gates</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {gateList.map((g) => (
            <div key={g.key} className={`rounded-md border p-4 ${GATE_STYLE[g.status]}`}>
              <p className="font-semibold">
                Gate {g.key} · {g.status === 'met' ? 'Met' : g.status === 'missed' ? 'Missed' : `${g.daysLeft} days left`}
              </p>
              <p className="text-sm text-muted-foreground">{g.date}</p>
              <p className="mt-2 text-sm">{g.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {(extras.failedMessages > 0 || extras.lastTick) && (
        <p className="text-sm text-muted-foreground">
          {extras.lastTick ? `Background jobs last ran ${extras.lastTick.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo' })}.` : 'Background jobs have not run yet.'}
          {extras.failedMessages > 0 && <span className="text-destructive"> {extras.failedMessages} messages failed. Check the prospect or client timelines.</span>}
        </p>
      )}

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
