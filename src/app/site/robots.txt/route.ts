import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${config.publicUrl}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
