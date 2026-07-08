import { initTRPC } from '@trpc/server';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { getDb } from '../db';
import { notesIndex } from '../db/schema';
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

async function listNotesFromFiles(): Promise<
  Array<{ path: string; title: string; folder: string; plScore?: number }>
> {
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
  }),

  echo: t.procedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echoed: input.message })),
});

export type AppRouter = typeof appRouter;
