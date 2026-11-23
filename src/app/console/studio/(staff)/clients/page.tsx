import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { desc, ilike, or, count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { ClientFields } from './client-fields';
import { saveClient } from './actions';
import { inputClass } from '@/components/studio/Field';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q } = await searchParams;
  const rows = await db
    .select({ id: clients.id, name: clients.name, type: clients.type, phone: clients.phone, engagements: count(engagements.id) })
    .from(clients)
    .leftJoin(engagements, eq(engagements.clientId, clients.id))
    .where(q ? or(ilike(clients.name, `%${q}%`), ilike(clients.phone, `%${q}%`)) : undefined)
    .groupBy(clients.id)
    .orderBy(desc(clients.createdAt))
    .limit(200);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">Clients</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or phone" className={inputClass} />
        </form>
      </div>
      <table className="w-full panel text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th scope="col" className="p-3">Name</th>
            <th scope="col" className="p-3">Type</th>
            <th scope="col" className="p-3">Phone</th>
            <th scope="col" className="p-3">Engagements</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">
                <Link href={`/studio/clients/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                  {c.name}
                </Link>
              </td>
              <td className="p-3 capitalize">{c.type}</td>
              <td className="p-3">{c.phone}</td>
              <td className="p-3">{c.engagements}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-muted-foreground">
                No clients yet. Seller intakes from vikkaa.lk/sell appear here, or add one below.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <section className="max-w-2xl panel p-5">
        <h2 className="mb-4 font-semibold">Add a client</h2>
        <ActionForm action={saveClient} submitLabel="Add client">
          <ClientFields />
        </ActionForm>
      </section>
    </div>
  );
}
