import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedOnly = process.argv.includes('--seed-only');

async function run() {
  try {
    if (!seedOnly) {
      const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
      console.log('[migrate] applying schema…');
      await pool.query(schema);
      console.log('[migrate] schema applied.');
    }
    const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
    console.log('[migrate] seeding advisory content…');
    await pool.query(seed);
    console.log('[migrate] done.');
    process.exit(0);
  } catch (err) {
    console.error('[migrate] failed:', err.message);
    process.exit(1);
  }
}

run();
