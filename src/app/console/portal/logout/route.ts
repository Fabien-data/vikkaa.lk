import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { endPortalSession } from '@/server/portal-session';

export async function POST() {
  await endPortalSession();
  return NextResponse.redirect(config.publicUrl, 303);
}
