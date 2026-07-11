import { initTRPC } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { getDb } from '../db';
import { links, notesIndex } from '../db/schema';
import { buildIndexFromVault } from '../lib/vault/indexer';
import { parseVaultFile } from '../lib/vault/parse';
import { VALID_FOLDERS } from '../lib/vault/types';
import {
  buildFrontmatter,
  buildNotePath,
  deleteNote,
  writeNote,
} from '../lib/vault/writer';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

async function countVaultNotes(dir: string): Promise<number> {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) count += await countVaultNotes(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.md')) count += 1;
  }
  return count;
}

async function getGraphFromFiles() {
  const index = await buildIndexFromVault(VAULT_DIR);
  return {
    nodes: index.notes.map((n) => ({ id: n.path, title: n.title, folder: n.folder, plScore: n.plScore })),
    edges: index.links.map((l) => ({ source: l.sourcePath, target: l.targetPath })),
  };
}

async function listNotesFromFiles() {
  const index = await buildIndexFromVault(VAULT_DIR);
  return index.notes.map((n) => ({ path: n.path, title: n.title, folder: n.folder, plScore: n.plScore }));
}

async function getVaultMeta() {
  const index = await buildIndexFromVault(VAULT_DIR);
  const result = [];
  for (const note of index.notes) {
    const raw = await readFile(path.join(VAULT_DIR, note.path), 'utf-8');
    const parsed = parseVaultFile(note.path, raw);
    result.push({
      path: note.path,
      title: note.title,
      folder: note.folder,
      source: parsed.frontmatter.source,
      updated: note.updated,
      plScore: note.plScore,
    });
  }
  return result;
}

const noteInputSchema = z.object({
  title: z.string().min(1).max(200),
  folder: z.enum(VALID_FOLDERS),
  tags: z.array(z.string()).default([]),
  summary: z.string().default(''),
  body: z.string().default(''),
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
    return { status: 'ok' as const, vaultNoteCount: noteCount, indexedNoteCount, dbConfigured: Boolean(db) };
  }),

  graph: t.router({
    get: t.procedure.query(async () => {
      const db = getDb();
      if (db) {
        const noteRows = await db.select().from(notesIndex);
        if (noteRows.length > 0) {
          const linkRows = await db.select().from(links).where(eq(links.type, 'wiki'));
          return {
            nodes: noteRows.map((n) => ({ id: n.path, title: n.title, folder: n.folder, plScore: n.plScore })),
            edges: linkRows.map((l) => ({ source: l.sourcePath, target: l.targetPath })),
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
          return rows.map((n) => ({ path: n.path, title: n.title, folder: n.folder, plScore: n.plScore }));
        }
      }
      return listNotesFromFiles();
    }),

    get: t.procedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => {
        const filePath = path.join(VAULT_DIR, input.path);
        const content = await readFile(filePath, 'utf-8');
        return { content };
      }),

    meta: t.procedure.query(getVaultMeta),

    create: t.procedure
      .input(noteInputSchema)
      .mutation(async ({ input }) => {
        const frontmatter = buildFrontmatter(input.title, input.folder, input.tags, input.summary);
        const notePath = buildNotePath(input.folder, input.title);
        const fullPath = path.join(VAULT_DIR, notePath);

        if (existsSync(fullPath)) {
          throw new Error(`Note already exists: ${notePath}`);
        }

        await writeNote(VAULT_DIR, notePath, frontmatter, input.body);
        return { path: notePath, title: input.title };
      }),

    update: t.procedure
      .input(
        z.object({
          path: z.string(),
          title: z.string().min(1).max(200).optional(),
          folder: z.enum(VALID_FOLDERS).optional(),
          tags: z.array(z.string()).optional(),
          summary: z.string().optional(),
          body: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const filePath = path.join(VAULT_DIR, input.path);
        const existing = await readFile(filePath, 'utf-8');
        const parsed = parseVaultFile(input.path, existing);

        const updatedFrontmatter = buildFrontmatter(
          input.title ?? parsed.frontmatter.title,
          input.folder ?? parsed.frontmatter.folder,
          input.tags ?? parsed.frontmatter.tags,
          input.summary ?? parsed.frontmatter.summary,
          parsed.frontmatter.created,
        );
        const updatedBody = input.body ?? parsed.body;

        await writeNote(VAULT_DIR, input.path, updatedFrontmatter, updatedBody);
        return { path: input.path };
      }),

    delete: t.procedure
      .input(z.object({ path: z.string() }))
      .mutation(async ({ input }) => {
        await deleteNote(VAULT_DIR, input.path);
        return { deleted: input.path };
      }),
  }),

  echo: t.procedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echoed: input.message })),
});

export type AppRouter = typeof appRouter;
