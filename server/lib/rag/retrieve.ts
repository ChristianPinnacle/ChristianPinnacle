import { eq, like } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { parseVaultFile } from '../vault/parse';
import type { VaultIndex } from '../vault/types';
import { chunkText } from './chunk';
import { cosineSimilarity, embedTexts, isVoyageConfigured } from './embed';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

type Db = MySql2Database<typeof schema>;

export type EmbedVaultResult = {
  notesEmbedded: number;
  chunksWritten: number;
  skipped: boolean;
  reason?: string;
};

type PendingChunk = {
  path: string;
  chunkIdx: number;
  text: string;
};

function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((v) => Number(v));
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map((v) => Number(v));
  }
  return [];
}

const EMBED_BATCH_SIZE = 64;

export async function embedVaultNotes(
  db: Db,
  vaultDir: string,
  index: VaultIndex,
): Promise<EmbedVaultResult> {
  if (!isVoyageConfigured()) {
    return {
      notesEmbedded: 0,
      chunksWritten: 0,
      skipped: true,
      reason: 'VOYAGE_API_KEY not set',
    };
  }

  const pending: PendingChunk[] = [];
  for (const note of index.notes) {
    const raw = await readFile(path.join(vaultDir, note.path), 'utf-8');
    const parsed = parseVaultFile(note.path, raw);
    for (const chunk of chunkText(parsed.body)) {
      pending.push({
        path: note.path,
        chunkIdx: chunk.chunkIdx,
        text: chunk.text.slice(0, 4096),
      });
    }
  }

  if (pending.length === 0) {
    await db.delete(schema.embeddings);
    return { notesEmbedded: 0, chunksWritten: 0, skipped: false };
  }

  const vectors: number[][] = [];
  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBED_BATCH_SIZE);
    const batchVectors = await embedTexts(
      batch.map((c) => c.text),
      'document',
    );
    vectors.push(...batchVectors);
    if (i + EMBED_BATCH_SIZE < pending.length) {
      await new Promise((resolve) => setTimeout(resolve, 21_000));
    }
  }

  await db.delete(schema.embeddings);
  await db.insert(schema.embeddings).values(
    pending.map((chunk, i) => ({
      path: chunk.path,
      chunkIdx: chunk.chunkIdx,
      text: chunk.text,
      vector: vectors[i] ?? [],
    })),
  );

  return {
    notesEmbedded: new Set(pending.map((c) => c.path)).size,
    chunksWritten: pending.length,
    skipped: false,
  };
}

/** Re-embed a single note (delete old chunks first). Returns chunk count. */
export async function embedNotePath(
  db: Db,
  vaultDir: string,
  notePath: string,
): Promise<number> {
  if (!isVoyageConfigured()) return 0;

  const raw = await readFile(path.join(vaultDir, notePath), 'utf-8');
  const parsed = parseVaultFile(notePath, raw);
  const chunks = chunkText(parsed.body).map((chunk) => ({
    ...chunk,
    text: chunk.text.slice(0, 4096),
  }));

  await db.delete(schema.embeddings).where(eq(schema.embeddings.path, notePath));

  if (chunks.length === 0) return 0;

  const vectors = await embedTexts(
    chunks.map((c) => c.text),
    'document',
  );

  await db.insert(schema.embeddings).values(
    chunks.map((chunk, i) => ({
      path: notePath,
      chunkIdx: chunk.chunkIdx,
      text: chunk.text,
      vector: vectors[i] ?? [],
    })),
  );

  return chunks.length;
}

export type RetrievedChunk = {
  path: string;
  chunkIdx: number;
  text: string;
  score: number;
};

export async function retrieveChunks(
  db: Db,
  query: string,
  options?: { topK?: number; pathFilter?: string; folderPrefix?: string },
): Promise<RetrievedChunk[]> {
  const topK = options?.topK ?? 6;
  const [queryVector] = await embedTexts([query], 'query');
  if (!queryVector) return [];

  let rows;
  if (options?.pathFilter) {
    rows = await db
      .select()
      .from(schema.embeddings)
      .where(eq(schema.embeddings.path, options.pathFilter));
  } else if (options?.folderPrefix) {
    const prefix = options.folderPrefix.endsWith('/')
      ? options.folderPrefix
      : `${options.folderPrefix}/`;
    rows = await db
      .select()
      .from(schema.embeddings)
      .where(like(schema.embeddings.path, `${prefix}%`));
  } else {
    rows = await db.select().from(schema.embeddings);
  }

  return rows
    .map((row) => ({
      path: row.path,
      chunkIdx: row.chunkIdx,
      text: row.text,
      score: cosineSimilarity(queryVector, parseVector(row.vector)),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
