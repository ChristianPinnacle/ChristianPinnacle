import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { initTRPC, TRPCError } from '@trpc/server';
import { readdir } from 'node:fs/promises';
import { z } from 'zod';
import {
  COOKIE_NAME,
  SESSION_TTL_MS,
  unlockWithPin,
} from '../lib/auth/pin';
import { getDb } from '../db';
import { embeddings, notesIndex } from '../db/schema';
import { buildGraphPayload, mergeAiEdges } from '../lib/graph/buildGraph';
import { buildHudPayload } from '../lib/hud/buildHud';
import { answerWithContext } from '../lib/rag/ask';
import { runCreate } from '../lib/rag/create';
import { runDecide } from '../lib/rag/decide';
import {
  acceptAiLink,
  listPendingAiLinks,
  loadAiGraphEdges,
  proposeAiLinksForNote,
  rejectAiLink,
} from '../lib/rag/autolink';
import { isVoyageConfigured } from '../lib/rag/embed';
import { embedNotePath, retrieveChunks } from '../lib/rag/retrieve';
import { enrichNoteIfNeeded } from '../lib/rag/enrichNote';
import { isAnthropicConfigured } from '../lib/invokeLLM';
import { readVaultIndexFromDb, writeVaultIndex } from '../lib/vault/db';
import { buildIndexFromVault } from '../lib/vault/indexer';
import {
  createNote,
  deleteNote,
  getNote,
  updateNote,
} from '../lib/vault/notes';
import {
  findOrphans,
  quarantineCandidates,
  quarantineOrphan,
} from '../lib/vault/orphans';
import { VALID_FOLDERS, type VaultIndex } from '../lib/vault/types';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const pinGuard = t.middleware(({ ctx, next, path }) => {
  if (path === 'health' || path === 'echo' || path.startsWith('auth.')) {
    return next();
  }
  if (ctx.pinRequired && !ctx.unlocked) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN required' });
  }
  return next();
});

const procedure = t.procedure.use(pinGuard);

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

/** After note write: refresh index, embed, propose AI links (best-effort). */
async function afterNoteWrite(notePath: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    const index = await buildIndexFromVault(VAULT_DIR);
    await writeVaultIndex(db, index);

    if (!isVoyageConfigured()) return;

    await embedNotePath(db, VAULT_DIR, notePath);
    await proposeAiLinksForNote(db, notePath);
  } catch (err) {
    console.error('[autolink] afterNoteWrite failed:', err);
  }
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
  auth: t.router({
    status: procedure.query(({ ctx }) => ({
      pinRequired: ctx.pinRequired,
      unlocked: ctx.unlocked,
    })),

    unlock: procedure
      .input(z.object({ pin: z.string().min(4).max(8) }))
      .mutation(({ ctx, input }) => {
        const result = unlockWithPin(input.pin);
        if (!result.ok) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: result.reason });
        }

        ctx.res.cookie(COOKIE_NAME, result.token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: SESSION_TTL_MS,
          path: '/',
        });

        return { ok: true as const };
      }),

    lock: procedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { path: '/' });
      return { ok: true as const };
    }),
  }),

  health: procedure.query(async () => {
    const noteCount = await countVaultNotes(VAULT_DIR);
    const db = getDb();
    let indexedNoteCount: number | null = null;
    let embeddingCount: number | null = null;

    if (db) {
      const rows = await db.select().from(notesIndex);
      indexedNoteCount = rows.length;
      const embRows = await db.select().from(embeddings);
      embeddingCount = embRows.length;
    }

    return {
      status: 'ok' as const,
      vaultNoteCount: noteCount,
      indexedNoteCount,
      embeddingCount,
      dbConfigured: Boolean(db),
      voyageConfigured: isVoyageConfigured(),
      anthropicConfigured: isAnthropicConfigured(),
    };
  }),

  chat: t.router({
    ask: procedure
      .input(
        z.object({
          question: z.string().min(1).max(2000),
          pathFilter: z.string().min(1).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!db) {
          throw new Error('DATABASE_URL is required for Scouter chat.');
        }
        if (!isVoyageConfigured()) {
          throw new Error('VOYAGE_API_KEY is required for Scouter chat.');
        }
        if (!isAnthropicConfigured()) {
          throw new Error('ANTHROPIC_API_KEY is required for Scouter chat.');
        }

        const chunks = await retrieveChunks(db, input.question, {
          topK: 6,
          pathFilter: input.pathFilter,
        });
        return answerWithContext(input.question, chunks);
      }),

    create: procedure
      .input(z.object({ brief: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!db) {
          throw new Error('DATABASE_URL is required for CREATE mode.');
        }
        if (!isVoyageConfigured()) {
          throw new Error('VOYAGE_API_KEY is required for CREATE mode.');
        }
        if (!isAnthropicConfigured()) {
          throw new Error('ANTHROPIC_API_KEY is required for CREATE mode.');
        }

        return runCreate(db, input.brief);
      }),

    decide: procedure
      .input(z.object({ question: z.string().min(1).max(2000) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!db) {
          throw new Error('DATABASE_URL is required for DECIDE mode.');
        }
        if (!isVoyageConfigured()) {
          throw new Error('VOYAGE_API_KEY is required for DECIDE mode.');
        }
        if (!isAnthropicConfigured()) {
          throw new Error('ANTHROPIC_API_KEY is required for DECIDE mode.');
        }

        return runDecide(db, input.question);
      }),
  }),

  vault: t.router({
    list: procedure.query(async () => {
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
    get: procedure.query(async () => {
      const index = await getVaultIndex();
      const payload = buildGraphPayload(index);
      const db = getDb();
      if (!db) return payload;
      const aiEdges = await loadAiGraphEdges(db);
      return mergeAiEdges(payload, aiEdges);
    }),
  }),

  links: t.router({
    pending: procedure.query(async () => {
      const db = getDb();
      if (!db) return [];
      return listPendingAiLinks(db);
    }),

    propose: procedure
      .input(z.object({ path: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!db) throw new Error('DATABASE_URL is required for auto-linking.');
        if (!isVoyageConfigured()) {
          throw new Error('VOYAGE_API_KEY is required for auto-linking.');
        }
        await embedNotePath(db, VAULT_DIR, input.path);
        return proposeAiLinksForNote(db, input.path);
      }),

    accept: procedure
      .input(
        z.object({
          sourcePath: z.string().min(1),
          targetPath: z.string().min(1),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!db) throw new Error('DATABASE_URL is required for auto-linking.');
        const result = await acceptAiLink(
          db,
          VAULT_DIR,
          input.sourcePath,
          input.targetPath,
        );
        const index = await buildIndexFromVault(VAULT_DIR);
        await writeVaultIndex(db, index);
        return result;
      }),

    reject: procedure
      .input(
        z.object({
          sourcePath: z.string().min(1),
          targetPath: z.string().min(1),
        }),
      )
      .mutation(async ({ input }) => {
        const db = getDb();
        if (!db) throw new Error('DATABASE_URL is required for auto-linking.');
        return rejectAiLink(db, input.sourcePath, input.targetPath);
      }),
  }),

  hud: t.router({
    get: procedure.query(async () => buildHudPayload(VAULT_DIR)),
  }),

  orphans: t.router({
    list: procedure.query(async () => {
      const index = await buildIndexFromVault(VAULT_DIR);
      const orphans = findOrphans(index);
      return {
        orphans,
        quarantine: quarantineCandidates(orphans),
      };
    }),

    quarantine: procedure
      .input(z.object({ path: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const note = await quarantineOrphan(VAULT_DIR, input.path);
        const db = getDb();
        if (db) {
          const index = await buildIndexFromVault(VAULT_DIR);
          await writeVaultIndex(db, index);
        }
        return note;
      }),
  }),

  notes: t.router({
    get: procedure
      .input(z.object({ path: z.string().min(1) }))
      .query(async ({ input }) => getNote(VAULT_DIR, input.path)),

    create: procedure.input(noteInputSchema).mutation(async ({ input }) => {
      let note = await createNote(VAULT_DIR, input);
      try {
        note = await enrichNoteIfNeeded(VAULT_DIR, note.path);
      } catch (err) {
        console.error('[enrich] create failed:', err);
      }
      await afterNoteWrite(note.path);
      return note;
    }),

    update: procedure
      .input(noteInputSchema.extend({ path: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { path: notePath, ...fields } = input;
        let note = await updateNote(VAULT_DIR, { path: notePath, ...fields });
        try {
          note = await enrichNoteIfNeeded(VAULT_DIR, note.path);
        } catch (err) {
          console.error('[enrich] update failed:', err);
        }
        await afterNoteWrite(note.path);
        return note;
      }),

    delete: procedure
      .input(z.object({ path: z.string().min(1) }))
      .mutation(async ({ input }) => deleteNote(VAULT_DIR, input.path)),
  }),

  portrait: t.router({
    upload: procedure
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

  echo: procedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echoed: input.message })),
});

export type AppRouter = typeof appRouter;
