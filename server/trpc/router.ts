import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { initTRPC } from '@trpc/server';
import { readdir } from 'node:fs/promises';
import { z } from 'zod';
import { getDb } from '../db';
import { notesIndex } from '../db/schema';
import { buildGraphPayload } from '../lib/graph/buildGraph';
import { buildHudPayload } from '../lib/hud/buildHud';
import { readVaultIndexFromDb } from '../lib/vault/db';
import { buildIndexFromVault } from '../lib/vault/indexer';
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
} from '../lib/vault/notes';
import { VALID_FOLDERS, type VaultIndex } from '../lib/vault/types';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const VAULT_DIR = path.resolve(process.cwd(), 'vault');
const PORTRAIT_PATH = path.join(VAULT_DIR, 'assets', 'portrait.png');

const portraitMimeSchema = z.enum(['image/png', 'image/jpeg', 'image/webp']);

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

async function getVaultIndex(): Promise<VaultIndex> {
  const db = getDb();
  if (db) {
    const fromDb = await readVaultIndexFromDb(db);
    if (fromDb.notes.length > 0) {
      return fromDb;
    }
  }

  return buildIndexFromVault(VAULT_DIR);
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

const noteInputSchema = z.object({
  title: z.string().min(1).max(255),
  folder: z.enum(VALID_FOLDERS),
  body: z.string(),
  tags: z.array(z.string()).optional(),
  summary: z.string().max(500).optional(),
});

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

  graph: t.router({
    get: t.procedure.query(async () => {
      const index = await getVaultIndex();
      return buildGraphPayload(index);
    }),
  }),

  hud: t.router({
    get: t.procedure.query(async () => buildHudPayload(VAULT_DIR)),
  }),

  notes: t.router({
    get: t.procedure
      .input(z.object({ path: z.string().min(1) }))
      .query(async ({ input }) => getNote(VAULT_DIR, input.path)),

    create: t.procedure.input(noteInputSchema).mutation(async ({ input }) => {
      return createNote(VAULT_DIR, input);
    }),

    update: t.procedure
      .input(noteInputSchema.extend({ path: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { path: notePath, ...fields } = input;
        return updateNote(VAULT_DIR, { path: notePath, ...fields });
      }),

    delete: t.procedure
      .input(z.object({ path: z.string().min(1) }))
      .mutation(async ({ input }) => deleteNote(VAULT_DIR, input.path)),
  }),

  portrait: t.router({
    upload: t.procedure
      .input(
        z.object({
          dataBase64: z.string().min(1),
          mimeType: portraitMimeSchema,
        }),
      )
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.dataBase64, 'base64');
        if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
          throw new Error('Portrait image must be between 1 byte and 5 MB');
        }

        await mkdir(path.dirname(PORTRAIT_PATH), { recursive: true });
        await writeFile(PORTRAIT_PATH, buffer);

        return {
          ok: true as const,
          url: `/vault-assets/portrait.png?v=${Date.now()}`,
        };
      }),
  }),

  echo: t.procedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echoed: input.message })),
});

export type AppRouter = typeof appRouter;
