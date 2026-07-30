import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

function createDb(connection: mysql.Pool) {
  return drizzle(connection, { schema, mode: 'default' });
}

export type Database = ReturnType<typeof createDb>;

let pool: mysql.Pool | null = null;
let db: Database | null = null;

export function getDb(): Database | null {
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool(databaseUrl);
    db = createDb(pool);
  }

  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export { schema };
