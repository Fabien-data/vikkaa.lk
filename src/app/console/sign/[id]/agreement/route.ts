import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents, signatories } from '@/db/schema';
import { verifySignedPath } from '@/lib/signed-url';
import { readPrivate } from '@/server/storage';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (verifySignedPath(`/sign/${id}`, new URL(req.url).searchParams) !== 'ok') {
    return new Response('This link has expired. Ask Vikkaa for a new one.', { status: 403 });
  }
  const [s] = await db.select().from(signatories).where(eq(signatories.id, id));
  if (!s) return new Response('Not found', { status: 404 });
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.engagementId, s.engagementId), eq(documents.type, 'agreement')))
    .orderBy(desc(documents.issuedAt))
    .limit(1);
  if (!doc) return new Response('The agreement is not ready yet.', { status: 404 });
  return new Response(new Uint8Array(await readPrivate(doc.storageKey)), {
    headers: { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="vikkaa-agreement.pdf"', 'cache-control': 'private, no-store' },
  });
}
