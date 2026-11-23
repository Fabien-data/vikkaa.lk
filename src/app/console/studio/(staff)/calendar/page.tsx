import { requireStaff } from '@/server/auth-guard';
import { SubmitButton } from '@/components/studio/SubmitButton';
import Link from 'next/link';
import { sriLankaDay, weekView } from '@/server/bookings';
import { deleteBooking } from './actions';

const DAY_MS = 86_400_000;
const utcDay = (day: string) => Date.parse(`${day}T00:00:00Z`);
const addDays = (day: string, n: number) => new Date(utcDay(day) + n * DAY_MS).toISOString().slice(0, 10);
/** Monday of the week that contains `day` (all dates are Sri Lanka calendar dates). */
const mondayOf = (day: string) => addDays(day, -((new Date(utcDay(day)).getUTCDay() + 6) % 7));
const dayHeading = (day: string) =>
  new Date(utcDay(day)).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
const time = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireStaff();
  const { week } = await searchParams;
  const today = sriLankaDay(new Date());
  const monday = mondayOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) && !Number.isNaN(utcDay(week)) ? week : today);
  const days = await weekView(new Date(`${monday}T00:00:00+05:30`));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visits and shoots</h1>
          <p className="text-sm text-muted-foreground">Grouped by area so one trip covers one area. Book from an engagement.</p>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href={`/studio/calendar?week=${addDays(monday, -7)}`} className="underline">
            Previous week
          </Link>
          <Link href="/studio/calendar" className="underline">
            This week
          </Link>
          <Link href={`/studio/calendar?week=${addDays(monday, 7)}`} className="underline">
            Next week
          </Link>
        </nav>
      </div>

      {days.map((d) => (
        <section key={d.day} className={`rounded-md border bg-background p-4 ${d.day === today ? 'border-foreground' : ''}`}>
          <h2 className="mb-2 font-semibold">
            {dayHeading(d.day)}
            {d.day === today && <span className="ml-2 text-xs font-normal text-muted-foreground">today</span>}
          </h2>
          {d.areas.length === 0 && <p className="text-sm text-muted-foreground">Nothing booked.</p>}
          {d.areas.map((g) => (
            <div key={g.area} className="mb-3 last:mb-0">
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">{g.area}</h3>
              <ul className="grid gap-1 text-sm">
                {g.bookings.map((b) => {
                  async function remove() {
                    'use server';
                    await deleteBooking(b.id);
                  }
                  return (
                    <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-l-2 pl-3">
                      <span className="tabular-nums">
                        {time(b.startsAt)}–{time(new Date(b.startsAt.getTime() + b.durationMinutes * 60_000))}
                      </span>
                      <span className="font-medium capitalize">{b.type}</span>
                      <Link href={b.engagementId ? `/studio/engagements/${b.engagementId}` : `/studio/prospects/${b.prospectId}`} className="hover:underline">
                        {b.clientName}
                        {b.assetTitle && `: ${b.assetTitle}`}
                      </Link>
                      {b.notes && <span className="text-muted-foreground">{b.notes}</span>}
                      {b.type === 'shoot' && b.assetId && (
                        <Link href={`/studio/assets/${b.assetId}/shot-list`} className="underline">
                          Shot list
                        </Link>
                      )}
                      <form action={remove} className="ml-auto">
                        <SubmitButton plain confirm="Cancel this booking?" className="text-xs text-destructive">Cancel</SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
