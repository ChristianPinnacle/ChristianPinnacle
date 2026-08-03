import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import path from 'node:path';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { closeDb, getDb } from './db';
import { runMigrations } from './db/migrate';
import {
  assertAuthConfiguration,
  COOKIE_NAME,
  isPinConfigured,
  verifySessionToken,
} from './lib/auth/pin';
import { CLIENT_DIST, SEED_DIR, VAULT_DIR } from './lib/paths';
import { buildIndexFromVault } from './lib/vault/indexer';
import { writeVaultIndex } from './lib/vault/db';
import { seedVaultIfEmpty } from './lib/vault/seed';
import { startVaultWatcher } from './lib/vault/watcher';
import { captureInboxNote } from './lib/vault/inbox';
import { createContext } from './trpc/context';
import { appRouter } from './trpc/router';

const PORT = Number(process.env.PORT ?? 3001);

/** Comma-separated list so a custom domain and the Railway URL can coexist. */
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

assertAuthConfiguration();

type BootState = {
  ready: boolean;
  seeded: boolean;
  migrated: boolean;
  indexed: boolean;
  watcherStarted: boolean;
  lastError: string | null;
};

const boot: BootState = {
  ready: false,
  seeded: false,
  migrated: false,
  indexed: false,
  watcherStarted: false,
  lastError: null,
};

let vaultWatcher: ReturnType<typeof startVaultWatcher> | null = null;
let httpServer: Server | null = null;
let shuttingDown = false;

const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin: CLIENT_ORIGINS.length === 1 ? CLIENT_ORIGINS[0] : CLIENT_ORIGINS,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use('/vault-assets', (req, res, next) => {
  if (
    isPinConfigured() &&
    !verifySessionToken(req.cookies?.[COOKIE_NAME] as string | undefined)
  ) {
    res.status(401).json({ error: 'PIN required' });
    return;
  }
  next();
});
app.use('/vault-assets', express.static(path.join(VAULT_DIR, 'assets')));
app.use(
  '/trpc',
  createExpressMiddleware({ router: appRouter, createContext }),
);

/**
 * Agent / shortcut quick-capture. Disabled until INBOX_SECRET is set.
 * Header: x-inbox-secret: <secret>
 * Body: { "text": "...", "title"?: "..." }
 */
app.post('/inbox', express.json({ limit: '32kb' }), async (req, res) => {
  const configured = process.env.INBOX_SECRET?.trim();
  if (!configured) {
    res.status(503).json({ error: 'INBOX_SECRET not configured' });
    return;
  }
  if (req.header('x-inbox-secret') !== configured) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined;
  try {
    const note = await captureInboxNote(VAULT_DIR, { text, title });
    res.status(201).json({ path: note.path, title: note.title });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Inbox capture failed',
    });
  }
});

app.get('/health', (_req, res) => {
  const payload = {
    status: boot.ready && !boot.lastError ? ('ok' as const) : ('starting' as const),
    ready: boot.ready,
    seeded: boot.seeded,
    migrated: boot.migrated,
    indexed: boot.indexed,
    watcherStarted: boot.watcherStarted,
    dbConfigured: Boolean(getDb()),
    pinConfigured: isPinConfigured(),
    lastError: boot.lastError,
  };

  if (!boot.ready || boot.lastError) {
    res.status(503).json(payload);
    return;
  }

  res.json(payload);
});

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/trpc|\/health|\/vault-assets|\/inbox).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

async function bootstrapVaultIndex(): Promise<void> {
  try {
    if (await seedVaultIfEmpty(VAULT_DIR, SEED_DIR)) {
      console.log('[vault] Empty vault — seeded notes from baked-in vault-seed/.');
      boot.seeded = true;
    }
  } catch (err) {
    boot.lastError = err instanceof Error ? err.message : String(err);
    console.error('[vault] Seed failed:', err);
    return;
  }

  const db = getDb();
  if (!db) {
    console.log('[vault] DATABASE_URL not set — file scan only, watcher disabled.');
    boot.ready = true;
    return;
  }

  try {
    await runMigrations();
    boot.migrated = true;
    console.log('[db] Migrations applied (schema ready).');
    const index = await buildIndexFromVault(VAULT_DIR);
    await writeVaultIndex(db, index);
    boot.indexed = true;
    console.log(
      `[vault] Initial index — ${index.notes.length} notes, ${index.links.length} links`,
    );
    vaultWatcher = startVaultWatcher(VAULT_DIR);
    boot.watcherStarted = true;
    boot.ready = true;
  } catch (err) {
    boot.lastError = err instanceof Error ? err.message : String(err);
    console.error('[vault] Initial index failed:', err);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received — shutting down`);

  try {
    if (vaultWatcher) {
      await vaultWatcher.close();
      vaultWatcher = null;
    }
  } catch (err) {
    console.error('[server] Watcher close failed:', err);
  }

  await new Promise<void>((resolve) => {
    if (!httpServer) {
      resolve();
      return;
    }
    httpServer.close(() => resolve());
  });

  try {
    await closeDb();
  } catch (err) {
    console.error('[server] DB close failed:', err);
  }

  process.exit(0);
}

httpServer = app.listen(PORT, () => {
  console.log(`Saiyan Archive server listening on http://localhost:${PORT}`);
  void bootstrapVaultIndex();
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});
