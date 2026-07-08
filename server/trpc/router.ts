import { initTRPC } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getDb } from '../db';
import { links, notesIndex } from '../db/schema';
import { buildIndexFromVault } from '../lib/vault/indexer';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

async function countVaultNotes(dir: string): Promise<number> {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countVaultNotes(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      count += 1;
    }
  }

  return count;
}

async function getGraphFromFiles() {
  const index = await buildIndexFromVault(VAULT_DIR);
  return {
    nodes: index.notes.map((note) => ({
      id: note.path,
      title: note.title,
      folder: note.folder,
      plScore: note.plScore,
    })),
    edges: index.links.map((link) => ({
      source: link.sourcePath,
      target: link.targetPath,
    })),
  };
}

async function listNotesFromFiles() {
  const index = await buildIndexFromVault(VAULT_DIR);
  return index.notes.map((note) => ({
    path: note.path,
    title: note.title,
    folder: note.folder,
    plScore: note.plScore,
  }));
}

export const appRouter = t.router({
  health: t.procedure.query(async () => {
    const noteCount = await countVaultNotes(VAULT_DIR);
    const db = getDb();
    let indexedNoteCount: number | null = null;

    if (db) {
      const rows = await db.select().from(notesIndex);
      indexedNoteCount = rows.length;
    }

    return {
      status: 'ok' as const,
      vaultNoteCount: noteCount,
      indexedNoteCount,
      dbConfigured: Boolean(db),
    };
  }),

  graph: t.router({
    get: t.procedure.query(async () => {
      const db = getDb();
      if (db) {
        const noteRows = await db.select().from(notesIndex);
        if (noteRows.length > 0) {
          const linkRows = await db
            .select()
            .from(links)
            .where(eq(links.type, 'wiki'));
          return {
            nodes: noteRows.map((note) => ({
              id: note.path,
              title: note.title,
              folder: note.folder,
              plScore: note.plScore,
            })),
            edges: linkRows.map((link) => ({
              source: link.sourcePath,
              target: link.targetPath,
            })),
          };
        }
      }
      return getGraphFromFiles();
    }),
  }),

  vault: t.router({
    list: t.procedure.query(async () => {
      const db = getDb();
      if (db) {
        const rows = await db.select().from(notesIndex);
        if (rows.length > 0) {
          return rows.map((note) => ({
            path: note.path,
            title: note.title,
            folder: note.folder,
            plScore: note.plScore,
          }));
        }
      }
      return listNotesFromFiles();
    }),

    get: t.procedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => {
        const { readFile } = await import('node:fs/promises');
        const filePath = path.join(VAULT_DIR, input.path);
        const content = await readFile(filePath, 'utf-8');
        return { content };
      }),
  }),

  echo: t.procedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echoed: input.message })),
});

export type AppRouter = typeof appRouter;
