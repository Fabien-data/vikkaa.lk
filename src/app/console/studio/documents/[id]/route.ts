import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { readPrivate } from '@/server/storage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return new Response('Not found', { status: 404 });
  const bytes = await readPrivate(doc.storageKey);
  const name = `${doc.number ?? doc.type}.pdf`;
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${name}"`,
      'cache-control': 'private, no-store',
    },
  });
}
