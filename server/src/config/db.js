import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// SSL is opt-in: managed providers (Render/Heroku/Supabase) need it, but local
// and Docker Postgres do not. Enable by adding `?sslmode=require` to
// DATABASE_URL or setting PGSSL=true.
const wantSsl = process.env.PGSSL === 'true' || /sslmode=require/.test(env.databaseUrl);

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: wantSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err.message);
});

export const query = (text, params) => pool.query(text, params);

/** Run a set of statements inside a transaction. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
