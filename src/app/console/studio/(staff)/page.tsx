import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { ArrowUpRight, CalendarClock, ListChecks, Send } from 'lucide-react';
import { db } from '@/db';
import { user } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { CountUp } from '@/components/site/motion/CountUp';
import { myOpenTasks } from '@/server/notes-tasks';
import { todayQueue } from '@/server/prospects';
import { gates, pitchProgress, runway, warRoomExtras, weekNumbers, type Gate } from '@/server/war-room';
import { TaskRow } from '@/components/studio/TasksPanel';
import { ActionForm } from '@/components/studio/ActionForm';
import { SubmitButton } from '@/components/studio/SubmitButton';
import { formatLkr } from '@/lib/money';
import { callOutcome, sendDueBatch, skipDueStep, whatsappSent } from './prospects/actions';

const GATE_STYLE: Record<Gate['status'], { chip: string; bar: string; text: string }> = {
  met: { chip: 'bg-emerald-100 text-emerald-900', bar: 'bg-emerald-500', text: 'Met' },
  open: { chip: 'bg-amber-100 text-amber-950', bar: 'bg-amber-400', text: 'Open' },
  missed: { chip: 'bg-red-100 text-red-900', bar: 'bg-red-500', text: 'Missed' },
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="panel grid gap-2 p-5 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgb(11_40_30/0.35)]">
      <p className="font-display text-[40px] leading-none tabular-nums text-brand-ink">{typeof value === 'number' ? <CountUp value={value} /> : value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Pitches towards the target, as a ring: the logo tick's green filling the circle. */
function PitchRing({ done, target }: { done: number; target: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const share = Math.min(1, target ? done / target : 0);
  return (
    <div className="relative grid size-36 shrink-0 place-items-center" role="img" aria-label={`${done} of ${target} pitches towards Gate A`}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-mint)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </svg>
      <p className="text-center leading-none" aria-hidden="true">
        <span className="font-display text-[44px] text-white">{done}</span>
        <span className="block pt-1 text-xs text-white/60">of {target} pitches</span>
      </p>
    </div>
  );
}

const colomboHour = (d: Date) => Number(d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', hour: 'numeric', hour12: false }));
const greeting = (d: Date) => (colomboHour(d) < 12 ? 'Good morning' : colomboHour(d) < 17 ? 'Good afternoon' : 'Good evening');

export default async function WarRoom() {
  const { userId } = await requireStaff();
  const now = new Date();
  const extras = await warRoomExtras(now);
  const [me] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
  const [tasks, queue, week, pitches, gateList, run] = await Promise.all([
    myOpenTasks(userId),
    todayQueue(userId, now),
    weekNumbers(now),
    pitchProgress(),
    gates(now, extras),
    runway(now),
  ]);
  const emails = queue.filter((q) => q.step.channel === 'email' && q.email && q.hasBasis);
  const whatsapps = queue.filter((q) => q.step.channel === 'whatsapp' && q.hasBasis);
  // Electronic steps wait until a founder records how we may contact them; calls and visits are made in person.
  const noBasis = queue.filter((q) => (q.step.channel === 'email' || q.step.channel === 'whatsapp') && !q.hasBasis && !q.doNotContact);
  const calls = queue.filter((q) => q.step.channel === 'call' && !q.doNotContact);
  const gateB = gateList.find((g) => g.key === 'B');
  const planB = gateB?.status === 'missed';
  const firstName = me?.name?.trim().split(/\s+/)[0];
  const today = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="grid gap-6">
      <section aria-labelledby="war-h" className="bg-glow grain relative overflow-hidden rounded-[2rem] p-6 text-white md:p-10">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-8">
          <div className="grid max-w-xl gap-4">
            <p className="eyebrow text-mint/90">War room · {today}</p>
            <h1 id="war-h" className="font-display text-[clamp(38px,4.6vw,64px)] leading-[0.98]">
              {greeting(now)}
              {firstName ? `, ${firstName}` : ''}. <em className="text-mint">Let&rsquo;s sell.</em>
            </h1>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li className="chip bg-white/10 py-1.5 text-white ring-1 ring-white/15">
                <Send aria-hidden="true" className="size-3.5 text-mint" /> {queue.length} to contact today
              </li>
              <li className="chip bg-white/10 py-1.5 text-white ring-1 ring-white/15">
                <ListChecks aria-hidden="true" className="size-3.5 text-mint" /> {tasks.length} open tasks
              </li>
              {gateB && (
                <li className="chip bg-white/10 py-1.5 text-white ring-1 ring-white/15">
                  {gateB.status === 'open' ? <span aria-hidden="true" className="live-dot" /> : <CalendarClock aria-hidden="true" className="size-3.5 text-mint" />}
                  Gate B {gateB.status === 'met' ? 'met' : gateB.status === 'missed' ? 'missed' : `in ${gateB.daysLeft} days`}
                </li>
              )}
            </ul>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/studio/prospects" className="btn btn-light px-5 py-3 text-sm">
                All prospects <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/studio/calendar" className="btn btn-ghost px-5 py-3 text-sm">
                Calendar
              </Link>
            </div>
          </div>
          <PitchRing done={pitches.done} target={pitches.target} />
        </div>
      </section>

      {planB && (
        <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
          <strong>Gate B was missed.</strong> Trigger Plan B now: change the offer or price, and agree who takes part-time income while the other keeps selling.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <section aria-labelledby="today-h" className="grid gap-4 panel p-6">
        <h2 id="today-h" className="flex items-baseline gap-2 text-lg font-semibold">
          Today&rsquo;s outreach <span className="chip bg-mist text-ink-soft">{queue.length} due</span>
        </h2>

        {emails.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Emails ({emails.length})</h3>
            <ActionForm action={sendDueBatch} submitLabel={`Send ticked emails`} className="grid gap-2">
              <ul className="grid gap-1 text-sm">
                {emails.map((q) => (
                  <li key={q.prospect.id}>
                    <label className="flex items-start gap-2">
                      {/* The hash pins the copy shown here: if the template changes before sending, that email is refused. */}
                      <input type="checkbox" name="reviewed" value={`${q.prospect.id}:${q.email!.hash}`} defaultChecked className="mt-1" />
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

        {noBasis.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Waiting for a contact basis ({noBasis.length})</h3>
            <p className="text-sm text-muted-foreground">No email or WhatsApp goes until you record how you may contact them: an introduction, their request, or their yes in person.</p>
            <ul className="grid gap-1 text-sm">
              {noBasis.map((q) => (
                <li key={q.prospect.id}>
                  <Link href={`/studio/prospects/${q.prospect.id}#basis`} className="font-medium hover:underline">
                    {q.prospect.name}
                  </Link>{' '}
                  <span className="text-muted-foreground">· record basis</span>
                </li>
              ))}
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

      <section className="panel grid gap-3 p-6" aria-labelledby="tasks-h">
        <h2 id="tasks-h" className="flex items-baseline gap-2 text-lg font-semibold">
          My open tasks <span className="chip bg-mist text-ink-soft">{tasks.length}</span>
        </h2>
        <ul className="grid gap-2.5 text-sm">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} showSubject />
          ))}
          {tasks.length === 0 && <li className="text-muted-foreground">Nothing open. Tasks for you or for either of you show here.</li>}
        </ul>
      </section>
      </div>

      <section aria-labelledby="week-h" className="grid gap-3">
        <h2 id="week-h" className="eyebrow text-ink-soft">This week</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Prospects contacted" value={week.contacted} />
          <Stat label="Pitches" value={week.pitches} />
          <Stat label="Replied" value={week.replied} />
          <Stat label="Meetings" value={week.meetings} />
          <Stat label="Won" value={week.won} />
        </div>
        <div className="panel p-5">
          <div className="mb-3 flex justify-between text-sm">
            <span className="font-medium">Pitches towards Gate A</span>
            <span className="tabular-nums text-muted-foreground">
              {pitches.done} / {pitches.target}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-label="Pitches towards Gate A" aria-valuemin={0} aria-valuemax={pitches.target} aria-valuenow={pitches.done}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-green to-glow transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${Math.min(100, (pitches.done / pitches.target) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="money-h" className="grid gap-3">
        <h2 id="money-h" className="eyebrow text-ink-soft">Money</h2>
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
            {extras.survival.needed == null
              ? 'Survival number: the cheapest campaign or retainer does not cover its own delivery cost. Raise the price or cut the cost in Settings.'
              : `Survival number: ${extras.survival.needed} paying clients a month cover both founders’ costs after delivery. Paying retainers now: ${extras.survival.active}.`}
          </p>
        )}
      </section>

      <section aria-labelledby="gates-h" className="grid gap-3">
        <h2 id="gates-h" className="eyebrow text-ink-soft">Gates</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {gateList.map((g) => (
            <div key={g.key} className="panel grid gap-3 overflow-hidden p-5">
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${GATE_STYLE[g.status].bar}`} />
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-3xl leading-none text-brand-ink">Gate {g.key}</p>
                <span className={`chip ${GATE_STYLE[g.status].chip}`}>{g.status === 'open' ? `${g.daysLeft} days left` : GATE_STYLE[g.status].text}</span>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{g.date}</p>
              <p className="text-sm text-ink-soft">{g.detail}</p>
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

    </div>
  );
}
