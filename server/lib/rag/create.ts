/**
 * CREATE mode — generate draft content grounded in Soul File + vault frameworks.
 */
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { inArray } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { invokeLLM } from '../invokeLLM';
import { buildCitations, type AskCitation } from './ask';
import { retrieveChunks, type RetrievedChunk } from './retrieve';

type Db = MySql2Database<typeof schema>;

/** Always prefer these framework notes when present in embeddings. */
export const CREATE_ANCHOR_PATHS = [
  'resources/pinnacle-soul-file.md',
  'resources/marketing-playbook.md',
] as const;

export type CreateResult = {
  draft: string;
  titleSuggestion: string;
  citations: AskCitation[];
  sourcePaths: string[];
};

/** Exported for tests — merge RAG hits with mandatory framework chunks. */
export function mergeCreateChunks(
  retrieved: RetrievedChunk[],
  anchors: RetrievedChunk[],
  maxTotal = 8,
): RetrievedChunk[] {
  const byKey = new Map<string, RetrievedChunk>();

  for (const chunk of anchors) {
    byKey.set(`${chunk.path}::${chunk.chunkIdx}`, chunk);
  }
  for (const chunk of retrieved) {
    const key = `${chunk.path}::${chunk.chunkIdx}`;
    if (!byKey.has(key)) byKey.set(key, chunk);
  }

  const merged = [...byKey.values()];
  // Keep anchors first, then highest score
  merged.sort((a, b) => {
    const aAnchor = CREATE_ANCHOR_PATHS.includes(
      a.path as (typeof CREATE_ANCHOR_PATHS)[number],
    );
    const bAnchor = CREATE_ANCHOR_PATHS.includes(
      b.path as (typeof CREATE_ANCHOR_PATHS)[number],
    );
    if (aAnchor !== bAnchor) return aAnchor ? -1 : 1;
    return b.score - a.score;
  });

  return merged.slice(0, maxTotal);
}

export async function loadAnchorChunks(db: Db): Promise<RetrievedChunk[]> {
  const rows = await db
    .select()
    .from(schema.embeddings)
    .where(inArray(schema.embeddings.path, [...CREATE_ANCHOR_PATHS]));

  return rows.map((row) => ({
    path: row.path,
    chunkIdx: row.chunkIdx,
    text: row.text,
    score: 1,
  }));
}

export function suggestTitleFromBrief(brief: string): string {
  const cleaned = brief.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Untitled draft';
  const first = cleaned.split(/[.!?]/)[0] ?? cleaned;
  return first.slice(0, 80).trim() || 'Untitled draft';
}

export function parseCreateDraft(raw: string): { title: string; draft: string } {
  const titleMatch = raw.match(/^TITLE:\s*(.+)$/im);
  const title = titleMatch?.[1]?.trim() || '';
  let draft = raw;
  if (titleMatch) {
    draft = raw.replace(titleMatch[0], '').trim();
  }
  // Strip optional DRAFT: label
  draft = draft.replace(/^DRAFT:\s*/i, '').trim();
  return { title, draft };
}

export async function createWithContext(
  brief: string,
  chunks: RetrievedChunk[],
): Promise<CreateResult> {
  const citations = buildCitations(chunks);

  if (chunks.length === 0) {
    return {
      draft:
        'No vault context available. Reindex with VOYAGE_API_KEY, then ensure the Pinnacle Soul File is in the vault.',
      titleSuggestion: suggestTitleFromBrief(brief),
      citations: [],
      sourcePaths: [],
    };
  }

  const context = chunks
    .map((chunk, i) => `[${i + 1}] path=${chunk.path}\n${chunk.text}`)
    .join('\n\n');

  const raw = await invokeLLM(
    [
      {
        role: 'system',
        content:
          'You are the Saiyan Archive CREATE engine. Write draft content that matches the Pinnacle Soul File voice ' +
          '(direct, evidence-backed, coach-to-coach) and any framework notes in context. ' +
          'Use ONLY the provided vault context for facts and brand voice. ' +
          'Reply in this exact format:\nTITLE: <short note title>\nDRAFT:\n<markdown body>\n' +
          'Do not invent products, claims, or decisions not supported by context. If context is thin, say what is missing and still draft a best-effort outline.',
      },
      {
        role: 'user',
        content: `Vault context:\n\n${context}\n\nCreate brief: ${brief}`,
      },
    ],
    { maxTokens: 1400 },
  );

  const parsed = parseCreateDraft(raw);
  const titleSuggestion = parsed.title || suggestTitleFromBrief(brief);

  return {
    draft: parsed.draft || raw.trim(),
    titleSuggestion,
    citations,
    sourcePaths: citations.map((c) => c.path),
  };
}

export async function runCreate(
  db: Db,
  brief: string,
): Promise<CreateResult> {
  const [retrieved, anchors] = await Promise.all([
    retrieveChunks(db, brief, { topK: 6 }),
    loadAnchorChunks(db),
  ]);
  const chunks = mergeCreateChunks(retrieved, anchors);
  return createWithContext(brief, chunks);
}
