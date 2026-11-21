import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/server/auth';
import { db } from '@/db';
import { member } from '@/db/schema';

/** Staff-only gate for Studio pages and server actions. */
export async function requireStaff(): Promise<{ userId: string; organizationId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const [membership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.user.id))
    .limit(1);
  if (!membership) redirect('/login');

  return { userId: session.user.id, organizationId: membership.organizationId };
}
