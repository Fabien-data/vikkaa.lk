import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buyers, evidenceEntries } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { Field, inputClass } from '@/components/studio/Field';
import { EvidenceTable } from '@/components/studio/EvidenceTable';
import { LogEvidenceForm } from '@/components/studio/LogEvidenceForm';
import { saveBuyer } from '../actions';
import { NotesPanel } from '@/components/studio/NotesPanel';
import { TasksPanel } from '@/components/studio/TasksPanel';

const rupees = (c: number | null) => (c ? String(c / 100) : '');

export default async function BuyerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [b] = await db.select().from(buyers).where(eq(buyers.id, id));
  if (!b) notFound();
  const entries = await db.query.evidenceEntries.findMany({
    where: eq(evidenceEntries.buyerId, id),
    orderBy: desc(evidenceEntries.seq),
    with: { asset: true },
  });
  const active = await db
    .select({ id: assets.id, title: assets.title })
    .from(assets)
    .where(inArray(assets.status, ['live', 'under_offer', 'production']));

  return (
    <div className="grid gap-6">
      <Link href="/studio/buyers" className="text-sm text-muted-foreground">
        Buyers
      </Link>
      <h1 className="text-2xl font-semibold">{b.name ?? b.phone}</h1>
      <p className="text-sm text-muted-foreground">
        {b.phone}
        {b.privacyAcceptedAt ? `. Accepted the privacy notice ${b.privacyAcceptedAt.toLocaleDateString('en-GB')}.` : '.'}
        {b.circleConsentAt && !b.circleWithdrawnAt ? ' Vikkaa Circle member.' : ''}
      </p>

      <section className="rounded-md border bg-background p-5">
        <h2 className="mb-4 font-semibold">Profile</h2>
        <ActionForm action={saveBuyer} submitLabel="Save profile">
          <input type="hidden" name="id" value={b.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <input name="name" defaultValue={b.name ?? ''} className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" defaultValue={b.email ?? ''} className={inputClass} />
            </Field>
            <Field label="NIC">
              <input name="nic" defaultValue={b.nic ?? ''} className={inputClass} />
            </Field>
            <Field label="Budget from (Rs)">
              <input name="budgetMinRupees" defaultValue={rupees(b.budgetMinCents)} className={inputClass} />
            </Field>
            <Field label="Budget to (Rs)">
              <input name="budgetMaxRupees" defaultValue={rupees(b.budgetMaxCents)} className={inputClass} />
            </Field>
            <Field label="Areas">
              <input name="areas" defaultValue={b.areas ?? ''} className={inputClass} />
            </Field>
            <Field label="Timeline">
              <input name="timeline" defaultValue={b.timeline ?? ''} className={inputClass} />
            </Field>
            <Field label="Financing">
              <input name="financing" defaultValue={b.financing ?? ''} className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </section>

      <section className="grid gap-4 rounded-md border bg-background p-5">
        <h2 className="font-semibold">Contact record</h2>
        <EvidenceTable entries={entries} show="asset" />
        {active.length > 0 && <LogEvidenceForm buyerId={b.id} assetOptions={active} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <NotesPanel subject={{ type: 'buyer', id: b.id }} />
        <TasksPanel subject={{ type: 'buyer', id: b.id }} />
      </div>
    </div>
  );
}
