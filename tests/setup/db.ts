import { vi, beforeEach } from 'vitest';

vi.mock('@/db', async () => await import('./test-db'));

beforeEach(async () => {
  const { client } = await import('./test-db');
  const { rows } = await client.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' and tablename <> 'organization'`,
  );
  if (rows.length) {
    await client.exec(`truncate ${rows.map((r) => `"${r.tablename}"`).join(', ')} restart identity cascade`);
  }
});
