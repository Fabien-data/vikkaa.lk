import { sitemapXml } from '@/server/public-assets';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await sitemapXml(), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
