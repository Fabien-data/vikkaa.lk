import { randomBytes, randomUUID } from 'node:crypto';
import { auth } from '@/server/auth';
import { db } from '@/db';
import { member } from '@/db/schema';
import { DEFAULT_ORG_ID } from '@/lib/rules';

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ');
if (!email || !name) {
  console.error('Usage: pnpm staff:create <email> <name>');
  process.exit(1);
}

// Public sign-up is disabled, so the account is created through Better Auth's server context.
const ctx = await auth.$context;
const password = randomBytes(12).toString('base64url');
const created = await ctx.internalAdapter.createUser(
  { email: email.toLowerCase(), name, emailVerified: true },
  { method: 'admin' },
);
await ctx.internalAdapter.linkAccount({
  userId: created.id,
  providerId: 'credential',
  accountId: created.id,
  password: await ctx.password.hash(password),
});
await db.insert(member).values({
  id: randomUUID(),
  userId: created.id,
  organizationId: DEFAULT_ORG_ID,
  role: 'owner',
  createdAt: new Date(),
});
console.log(`Created ${email}. Temporary password (shown once): ${password}`);
process.exit(0);
