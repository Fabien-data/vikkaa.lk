import { readFile } from 'node:fs/promises';
import { publicMediaPath } from '@/server/storage';

// Dev convenience: in production nginx serves /media straight from disk.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  try {
    const bytes = await readFile(publicMediaPath(path.join('/')));
    return new Response(bytes, { headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
