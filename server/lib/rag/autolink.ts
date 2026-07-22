/**
 * Phase 3 auto-linking: propose semantic edges from embedding similarity.
 * Pending AI links live in MySQL only until accept (writes [[wikilink]] to vault) or reject.
 */
import { and, eq, isNull, or } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { getNote, serializeNote } from '../vault/notes';
import { parseVaultFile } from '../vault/parse';
import { cosineSimilarity } from './embed';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type Db = MySql2Database<typeof schema>;

export type AiLinkProposal = {
  sourcePath: string;
  targetPath: string;
  confidence: number;
  accepted: boolean | null;
  sourceTitle: string;
  targetTitle: string;
};

export type ProposeResult = {
  proposed: number;
  proposals: AiLinkProposal[];
};

const DEFAULT_THRESHOLD = 0.55;
const DEFAULT_TOP_K = 3;

function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((v) => Number(v));
  if (typeof raw === 'string') {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map((v) => Number(v));
  }
  return [];
}

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0]?.length ?? 0;
  if (dim === 0) return [];

  const out = new Array<number>(dim).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dim; i += 1) {
      out[i] = (out[i] ?? 0) + (vec[i] ?? 0);
    }
  }
  return out.map((v) => v / vectors.length);
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

async function titleMap(db: Db): Promise<Map<string, string>> {
  const notes = await db.select().from(schema.notesIndex);
  return new Map(notes.map((n) => [n.path, n.title]));
}

export async function listPendingAiLinks(db: Db): Promise<AiLinkProposal[]> {
  const rows = await db
    .select()
    .from(schema.links)
    .where(and(eq(schema.links.type, 'ai'), isNull(schema.links.accepted)));

  const titles = await titleMap(db);
  return rows
    .map((row) => ({
      sourcePath: row.sourcePath,
      targetPath: row.targetPath,
      confidence: row.confidence ?? 0,
      accepted: row.accepted,
      sourceTitle: titles.get(row.sourcePath) ?? row.sourcePath,
      targetTitle: titles.get(row.targetPath) ?? row.targetPath,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

export async function proposeAiLinksForNote(
  db: Db,
  sourcePath: string,
  options?: { threshold?: number; topK?: number },
): Promise<ProposeResult> {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const topK = options?.topK ?? DEFAULT_TOP_K;

  const embRows = await db.select().from(schema.embeddings);
  const byPath = new Map<string, number[][]>();
  for (const row of embRows) {
    const list = byPath.get(row.path) ?? [];
    list.push(parseVector(row.vector));
    byPath.set(row.path, list);
  }

  const sourceVectors = byPath.get(sourcePath);
  if (!sourceVectors || sourceVectors.length === 0) {
    return { proposed: 0, proposals: [] };
  }
  const sourceAvg = averageVectors(sourceVectors);
  if (sourceAvg.length === 0) return { proposed: 0, proposals: [] };

  const allLinks = await db.select().from(schema.links);
  const blocked = new Set<string>();
  for (const link of allLinks) {
    if (link.type === 'wiki') {
      blocked.add(pairKey(link.sourcePath, link.targetPath));
    } else if (link.type === 'ai') {
      // pending, accepted, or rejected — don't re-propose
      blocked.add(pairKey(link.sourcePath, link.targetPath));
    }
  }

  const scored: Array<{ targetPath: string; confidence: number }> = [];
  for (const [targetPath, vectors] of byPath) {
    if (targetPath === sourcePath) continue;
    if (blocked.has(pairKey(sourcePath, targetPath))) continue;
    const avg = averageVectors(vectors);
    const confidence = cosineSimilarity(sourceAvg, avg);
    if (confidence >= threshold) {
      scored.push({ targetPath, confidence });
    }
  }

  scored.sort((a, b) => b.confidence - a.confidence);
  const top = scored.slice(0, topK);

  if (top.length > 0) {
    await db.insert(schema.links).values(
      top.map((row) => ({
        sourcePath,
        targetPath: row.targetPath,
        type: 'ai' as const,
        confidence: row.confidence,
        accepted: null,
      })),
    );
  }

  const titles = await titleMap(db);
  const proposals: AiLinkProposal[] = top.map((row) => ({
    sourcePath,
    targetPath: row.targetPath,
    confidence: row.confidence,
    accepted: null,
    sourceTitle: titles.get(sourcePath) ?? sourcePath,
    targetTitle: titles.get(row.targetPath) ?? row.targetPath,
  }));

  return { proposed: proposals.length, proposals };
}

export async function rejectAiLink(
  db: Db,
  sourcePath: string,
  targetPath: string,
): Promise<{ ok: true }> {
  await db
    .update(schema.links)
    .set({ accepted: false })
    .where(
      and(
        eq(schema.links.type, 'ai'),
        eq(schema.links.sourcePath, sourcePath),
        eq(schema.links.targetPath, targetPath),
      ),
    );
  return { ok: true };
}

export async function acceptAiLink(
  db: Db,
  vaultDir: string,
  sourcePath: string,
  targetPath: string,
): Promise<{ ok: true; path: string }> {
  const titles = await titleMap(db);
  const targetTitle = titles.get(targetPath);
  if (!targetTitle) {
    throw new Error(`Target note not found: ${targetPath}`);
  }

  const note = await getNote(vaultDir, sourcePath);
  const wikiToken = `[[${targetTitle}]]`;
  if (!note.body.includes(wikiToken)) {
    const body = `${note.body.trim()}\n\n${wikiToken}\n`;
    const raw = await readFile(path.join(vaultDir, sourcePath), 'utf-8');
    const parsed = parseVaultFile(sourcePath, raw);
    await writeFile(
      path.join(vaultDir, sourcePath),
      serializeNote(
        {
          ...parsed.frontmatter,
          updated: new Date().toISOString().slice(0, 10),
        },
        body,
      ),
      'utf-8',
    );
  }

  await db
    .delete(schema.links)
    .where(
      and(
        eq(schema.links.type, 'ai'),
        or(
          and(eq(schema.links.sourcePath, sourcePath), eq(schema.links.targetPath, targetPath)),
          and(eq(schema.links.sourcePath, targetPath), eq(schema.links.targetPath, sourcePath)),
        ),
      ),
    );

  return { ok: true, path: sourcePath };
}

export async function loadAiGraphEdges(db: Db): Promise<
  Array<{
    source: string;
    target: string;
    type: 'ai';
    confidence: number;
    accepted: boolean | null;
  }>
> {
  const rows = await db
    .select()
    .from(schema.links)
    .where(
      and(
        eq(schema.links.type, 'ai'),
        or(isNull(schema.links.accepted), eq(schema.links.accepted, true)),
      ),
    );

  return rows.map((row) => ({
    source: row.sourcePath,
    target: row.targetPath,
    type: 'ai' as const,
    confidence: row.confidence ?? 0,
    accepted: row.accepted,
  }));
}
