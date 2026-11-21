import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assets, clients, documents, engagements, enquiries, signatories, type DocumentType } from '@/db/schema';
import { config } from '@/lib/config';
import { isPublicStatus, stageLabel, statusLabel } from '@/lib/enums';

/** Documents a client may see in their portal. Draft agreements and scans stay internal. */
export const PORTAL_DOCUMENT_TYPES: DocumentType[] = ['proposal', 'invoice', 'receipt', 'agreement_signed'];

/** Everything the seller sees. Deliberately no buyer names, phones or evidence entries. */
export async function getPortalDashboard(clientId: string) {
  const [client] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, clientId));
  const rows = await db.query.engagements.findMany({
    where: eq(engagements.clientId, clientId),
    orderBy: desc(engagements.createdAt),
    with: { assets: { orderBy: asc(assets.createdAt) } },
  });
  const assetIds = rows.flatMap((e) => e.assets.map((a) => a.id));
  const counts = assetIds.length
    ? await db
        .select({ assetId: enquiries.assetId, n: count() })
        .from(enquiries)
        .where(inArray(enquiries.assetId, assetIds))
        .groupBy(enquiries.assetId)
    : [];
  const enquiryCount = new Map(counts.map((c) => [c.assetId, c.n]));

  const engagementsOut = [];
  for (const e of rows) {
    const docs = await db
      .select({ id: documents.id, type: documents.type, number: documents.number, issuedAt: documents.issuedAt })
      .from(documents)
      .where(and(eq(documents.engagementId, e.id), inArray(documents.type, PORTAL_DOCUMENT_TYPES)))
      .orderBy(desc(documents.issuedAt));
    const people = await db
      .select({ name: signatories.name, signedAt: signatories.signedAt })
      .from(signatories)
      .where(eq(signatories.engagementId, e.id))
      .orderBy(asc(signatories.createdAt));
    engagementsOut.push({
      id: e.id,
      stage: stageLabel(e.stage),
      assets: e.assets.map((a) => ({
        title: a.title,
        status: statusLabel(a.status),
        publicUrl: isPublicStatus(a.status) && a.publishedAt ? `${config.publicUrl}/${a.category}/${a.slug}` : null,
        enquiries: enquiryCount.get(a.id) ?? 0,
      })),
      documents: docs,
      signatories: people.map((p) => ({ name: p.name, signed: Boolean(p.signedAt) })),
    });
  }
  return { clientName: client?.name ?? '', engagements: engagementsOut };
}

/** The document if it belongs to this client and is a portal-visible type, else null. */
export async function portalDocument(clientId: string, documentId: string) {
  const [row] = await db
    .select({ doc: documents })
    .from(documents)
    .innerJoin(engagements, eq(documents.engagementId, engagements.id))
    .where(and(eq(documents.id, documentId), eq(engagements.clientId, clientId), inArray(documents.type, PORTAL_DOCUMENT_TYPES)));
  return row?.doc ?? null;
}
