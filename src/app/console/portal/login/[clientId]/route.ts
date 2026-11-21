import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { verifySignedPath } from '@/lib/signed-url';
import { config } from '@/lib/config';
import { startPortalSession } from '@/server/portal-session';

const EXPIRED_HTML = `<!doctype html><meta charset="utf-8"><title>Link expired</title>
<body style="font-family:system-ui;max-width:28rem;margin:6rem auto;text-align:center;padding:0 1rem">
<h1>This link has expired</h1><p>Links from Vikkaa work for 7 days. Ask us for a new one on WhatsApp.</p></body>`;

export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const ok = verifySignedPath(`/portal/login/${clientId}`, new URL(req.url).searchParams) === 'ok';
  const [client] = ok ? await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)) : [];
  if (!client) return new Response(EXPIRED_HTML, { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } });
  await startPortalSession(client.id);
  return NextResponse.redirect(`${config.appUrl}/portal`, 307);
}
