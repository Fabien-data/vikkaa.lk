import { Pool } from 'pg';
import { DEFAULT_ORG_ID } from '../src/lib/rules';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  `insert into organization (id, name, slug, created_at) values ($1, 'Vikkaa', 'vikkaa', now()) on conflict (id) do nothing`,
  [DEFAULT_ORG_ID],
);
await pool.end();
console.log(`Organization ${DEFAULT_ORG_ID} ready`);
