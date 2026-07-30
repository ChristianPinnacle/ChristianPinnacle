import { migrate } from 'drizzle-orm/mysql2/migrator';
import { MIGRATIONS_DIR } from '../lib/paths';
import { getDb } from './index';

/**
 * Apply pending Drizzle migrations (creates notes_index / links / embeddings
 * on a fresh database). Idempotent — Drizzle tracks applied migrations in
 * `__drizzle_migrations`, so every boot after the first is a no-op.
 *
 * No-ops when DATABASE_URL is unset (file-scan mode). The migrations folder is
 * shipped in the image via `COPY server ./server`.
 */
export async function runMigrations(): Promise<void> {
  const db = getDb();
  if (!db) return;

  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
