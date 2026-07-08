import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

let pool: mysql.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(): ReturnType<typeof drizzle<typeof schema>> | null {
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = mysql.createPool(databaseUrl);
    db = drizzle(pool, { schema, mode: 'default' });
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
