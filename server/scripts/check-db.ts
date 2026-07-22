import 'dotenv/config';
import { getDb, closeDb } from '../db/index';

async function main(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.log('DB_STATUS=null');
    process.exit(1);
  }

  try {
    await db.execute('SELECT 1 AS ok');
    console.log('DB_STATUS=ok');
  } catch (err) {
    console.log('DB_STATUS=fail');
    console.log(err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await closeDb();
  }
}

void main();
