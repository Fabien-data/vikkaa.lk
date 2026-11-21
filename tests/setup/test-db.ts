import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';

export const client = new PGlite();
export const db = drizzle(client, { schema, casing: 'snake_case' });

await migrate(db, { migrationsFolder: 'drizzle' });
await client.query(
  `insert into organization (id, name, slug, created_at) values ('org_vikkaa', 'Vikkaa', 'vikkaa', now()) on conflict do nothing`,
);
