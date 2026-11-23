import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { buyers, evidenceEntries } from '@/db/schema';
import { inputClass } from '@/components/studio/Field';
import { formatLkr } from '@/lib/money';

export default async function BuyersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const rows = await db
    .select({
      id: buyers.id,
      name: buyers.name,
      phone: buyers.phone,
      budgetMax: buyers.budgetMaxCents,
      areas: buyers.areas,
      circle: buyers.circleConsentAt,
      withdrawn: buyers.circleWithdrawnAt,
      contacts: count(evidenceEntries.id),
    })
    .from(buyers)
    .leftJoin(evidenceEntries, eq(evidenceEntries.buyerId, buyers.id))
    .where(q ? or(ilike(buyers.name, `%${q}%`), ilike(buyers.phone, `%${q}%`), ilike(buyers.areas, `%${q}%`)) : undefined)
    .groupBy(buyers.id)
    .orderBy(desc(buyers.createdAt))
    .limit(300);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Buyers</h1>
        <form>
          <input name="q" defaultValue={q} placeholder="Search name, phone or area" className={inputClass} />
        </form>
      </div>
      <table className="w-full rounded-md border bg-background text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th scope="col" className="p-3">Buyer</th>
            <th scope="col" className="p-3">Phone</th>
            <th scope="col" className="p-3">Budget up to</th>
            <th scope="col" className="p-3">Areas</th>
            <th scope="col" className="p-3">Vikkaa Circle</th>
            <th scope="col" className="p-3">Contacts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-3">
                <Link href={`/studio/buyers/${b.id}`} className="font-medium hover:underline">
                  {b.name ?? 'Unnamed'}
                </Link>
              </td>
              <td className="p-3">{b.phone}</td>
              <td className="p-3">{b.budgetMax ? formatLkr(b.budgetMax) : '—'}</td>
              <td className="p-3">{b.areas ?? '—'}</td>
              <td className="p-3">{b.circle && !b.withdrawn ? 'Member' : '—'}</td>
              <td className="p-3">{b.contacts}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-muted-foreground">
                No buyers yet. Enquiries from the website and check-ins at viewings appear here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
