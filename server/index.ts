import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { getDb } from './db';
import { buildIndexFromVault } from './lib/vault/indexer';
import { writeVaultIndex } from './lib/vault/db';
import { startVaultWatcher } from './lib/vault/watcher';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5174';
const VAULT_DIR = path.resolve(process.cwd(), 'vault');

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use('/vault-assets', express.static(path.join(VAULT_DIR, 'assets')));
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function bootstrapVaultIndex(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.log('[vault] DATABASE_URL not set — file scan only, watcher disabled.');
    return;
  }

  try {
    const index = await buildIndexFromVault(VAULT_DIR);
    await writeVaultIndex(db, index);
    console.log(
      `[vault] Initial index — ${index.notes.length} notes, ${index.links.length} links`,
    );
    startVaultWatcher(VAULT_DIR);
  } catch (err) {
    console.error('[vault] Initial index failed:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Saiyan Archive server listening on http://localhost:${PORT}`);
  void bootstrapVaultIndex();
});
