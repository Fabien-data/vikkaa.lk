import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { FitBadge } from '@/components/studio/FitBadge';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/studio/Field';
import { stageLabel } from '@/lib/enums';
import { ClientFields } from '../client-fields';
import { portalLink, saveClient } from '../actions';
import { ShareLinkButton } from '@/components/studio/ShareLinkButton';
import { createEngagement } from '../../engagements/actions';

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
    with: { engagements: { orderBy: desc(engagements.createdAt), with: { assets: true } } },
  });
  if (!client) notFound();

  return (
    <div className="grid gap-8">
      <div>
        <Link href="/studio/clients" className="text-sm text-muted-foreground">
          Clients
        </Link>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <ShareLinkButton getLink={portalLink.bind(null, client.id)} label="Get portal link" />
      </div>

      <section className="max-w-2xl rounded-md border bg-background p-5">
        <ActionForm action={saveClient} submitLabel="Save client">
          <ClientFields client={client} />
        </ActionForm>
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">Engagements</h2>
        <ul className="grid gap-2">
          {client.engagements.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-3 text-sm">
              <Link href={`/studio/engagements/${e.id}`} className="font-medium hover:underline">
                {e.assets.map((a) => a.title).join(', ') || 'No assets yet'}
              </Link>
              <span className="text-muted-foreground">{stageLabel(e.stage)}</span>
              <FitBadge score={e.fitScore} flags={e.fitFlags} />
            </li>
          ))}
        </ul>
        <form action={createEngagement} className="flex items-center gap-2">
          <input type="hidden" name="clientId" value={client.id} />
          <select name="type" defaultValue="single" className={`${inputClass} w-auto`}>
            <option value="single">Single asset</option>
            <option value="batch">Batch (several assets)</option>
            <option value="project">Developer project</option>
            <option value="retainer">Monthly retainer</option>
          </select>
          <Button type="submit" variant="outline">
            New engagement
          </Button>
        </form>
      </section>
    </div>
  );
}
