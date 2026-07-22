import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
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
const ASSETS_DIR = path.join(VAULT_DIR, 'assets');
const PORTRAIT_PATH = path.join(ASSETS_DIR, 'portrait.png');
const CLIENT_DIST = path.resolve(process.cwd(), 'dist/client');

const app = express();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use('/vault-assets', express.static(path.join(VAULT_DIR, 'assets')));
app.use(
  '/trpc',
  createExpressMiddleware({ router: appRouter, createContext }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/assets/portrait', (_req, res) => {
  if (!existsSync(PORTRAIT_PATH)) {
    res.status(404).json({ error: 'No portrait uploaded yet' });
    return;
  }
  res.sendFile(PORTRAIT_PATH);
});

app.post('/assets/portrait', async (req, res) => {
  try {
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (contentLength > 5 * 1024 * 1024) {
      res.status(413).json({ error: 'Image too large (max 5 MB)' });
      return;
    }
    await mkdir(ASSETS_DIR, { recursive: true });
    const out = createWriteStream(PORTRAIT_PATH);
    await pipeline(req, out);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/trpc|\/health|\/vault-assets|\/assets).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

async function bootstrapVaultIndex(): Promise<void> {
  const db = getDb();
  if (!db) {
    console.log('[vault] DATABASE_URL not set — file scan only, watcher disabled.');
    return;
  }
  try {
    const index = await buildIndexFromVault(VAULT_DIR);
    await writeVaultIndex(db, index);
    console.log(`[vault] Initial index — ${index.notes.length} notes, ${index.links.length} links`);
    startVaultWatcher(VAULT_DIR);
  } catch (err) {
    console.error('[vault] Initial index failed:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Saiyan Archive server listening on http://localhost:${PORT}`);
  void bootstrapVaultIndex();
});
