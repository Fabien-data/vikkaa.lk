import { getPortalClientId } from '@/server/portal-session';
import { portalDocument } from '@/server/portal';
import { readPrivate } from '@/server/storage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getPortalClientId();
  const doc = clientId ? await portalDocument(clientId, id) : null;
  if (!doc) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(await readPrivate(doc.storageKey)), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${doc.number ?? doc.type}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
