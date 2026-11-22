import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, type Asset } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { deleteBooking, saveBooking } from '../../calendar/actions';

export const whenText = (d: Date) =>
  d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export async function BookingsSection({ engagementId, assets }: { engagementId: string; assets: Asset[] }) {
  const rows = await db.select().from(bookings).where(eq(bookings.engagementId, engagementId)).orderBy(asc(bookings.startsAt));
  const titleOf = (id: string | null) => assets.find((a) => a.id === id)?.title;

  return (
    <section className="rounded-md border bg-background p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Visits and shoots</h2>
        <Link href="/studio/calendar" className="text-sm underline">
          Calendar
        </Link>
      </div>
      <ul className="mb-4 grid gap-2 text-sm">
        {rows.map((b) => {
          async function remove() {
            'use server';
            await deleteBooking(b.id);
          }
          return (
            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b pb-2">
              <span className="font-medium capitalize">{b.type}</span>
              <span>{whenText(b.startsAt)}</span>
              <span className="text-muted-foreground">{b.durationMinutes} min</span>
              <span>{b.area}</span>
              {b.assetId && <span className="text-muted-foreground">{titleOf(b.assetId)}</span>}
              {b.notes && <span className="text-muted-foreground">{b.notes}</span>}
              {b.type === 'shoot' && b.assetId && (
                <Link href={`/studio/assets/${b.assetId}/shot-list`} className="underline">
                  Shot list
                </Link>
              )}
              <form action={remove} className="ml-auto">
                <button className="text-xs text-destructive underline">Cancel</button>
              </form>
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-muted-foreground">Nothing booked yet.</li>}
      </ul>
      <ActionForm action={saveBooking} submitLabel="Book" className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <input type="hidden" name="engagementId" value={engagementId} />
        <Field label="Type">
          <select name="type" className={inputClass}>
            <option value="visit">Site visit</option>
            <option value="shoot">Shoot</option>
          </select>
        </Field>
        <Field label="Asset">
          <select name="assetId" defaultValue={assets.length === 1 ? assets[0].id : ''} className={inputClass}>
            <option value="">—</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="When (Sri Lanka time)">
          <input name="startsAt" type="datetime-local" className={inputClass} />
        </Field>
        <Field label="Duration (minutes)">
          <input name="durationMinutes" type="number" min={15} max={720} step={15} defaultValue={60} className={inputClass} />
        </Field>
        <Field label="Area" hint="Leave empty to use the asset's area">
          <input name="area" className={inputClass} />
        </Field>
        <Field label="Notes">
          <input name="notes" placeholder="Gate code, who meets us" className={inputClass} />
        </Field>
      </ActionForm>
    </section>
  );
}
