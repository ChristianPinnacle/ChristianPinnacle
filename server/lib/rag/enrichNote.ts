/**
 * Auto-tag + one-line summary for vault notes (Phase 3).
 * Fills empty frontmatter fields only — never overwrites user input.
 * All LLM calls go through invokeLLM.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { invokeLLM, isAnthropicConfigured } from '../invokeLLM';
import { getNote, serializeNote, type NoteRecord } from '../vault/notes';
import { parseVaultFile } from '../vault/parse';

export type NoteEnrichment = {
  tags: string[];
  summary: string;
};

const MAX_TAGS = 5;
const MAX_SUMMARY_CHARS = 160;

/** Exported for unit tests — parse Claude JSON (with optional markdown fences). */
export function parseEnrichmentResponse(raw: string): NoteEnrichment {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced?.[1] ?? trimmed).trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Try to salvage first {...} block
    const brace = trimmed.match(/\{[\s\S]*\}/);
    if (!brace) {
      return { tags: [], summary: '' };
    }
    try {
      parsed = JSON.parse(brace[0]);
    } catch {
      return { tags: [], summary: '' };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { tags: [], summary: '' };
  }

  const obj = parsed as { tags?: unknown; summary?: unknown };
  const tags = Array.isArray(obj.tags)
    ? obj.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
        .filter(Boolean)
        .slice(0, MAX_TAGS)
    : [];

  const summary =
    typeof obj.summary === 'string'
      ? obj.summary.trim().replace(/\s+/g, ' ').slice(0, MAX_SUMMARY_CHARS)
      : '';

  return { tags, summary };
}

export async function suggestTagsAndSummary(input: {
  title: string;
  folder: string;
  body: string;
}): Promise<NoteEnrichment> {
  if (!isAnthropicConfigured()) {
    return { tags: [], summary: '' };
  }

  const bodyPreview = input.body.trim().slice(0, 4000);
  if (!bodyPreview && !input.title.trim()) {
    return { tags: [], summary: '' };
  }

  const raw = await invokeLLM(
    [
      {
        role: 'system',
        content:
          'You enrich Saiyan Archive vault notes. Reply with ONLY valid JSON: ' +
          '{"tags":["kebab-case","tags"],"summary":"one short sentence"}. ' +
          `At most ${MAX_TAGS} tags. Summary max ${MAX_SUMMARY_CHARS} chars. No markdown fences.`,
      },
      {
        role: 'user',
        content:
          `Folder: ${input.folder}\nTitle: ${input.title}\n\nBody:\n${bodyPreview || '(empty)'}`,
      },
    ],
    { maxTokens: 256 },
  );

  return parseEnrichmentResponse(raw);
}

/**
 * If tags and/or summary are empty, fill from Claude and rewrite the vault file.
 * Returns the (possibly updated) note record.
 */
export async function enrichNoteIfNeeded(
  vaultDir: string,
  notePath: string,
): Promise<NoteRecord> {
  const note = await getNote(vaultDir, notePath);
  const needTags = note.tags.length === 0;
  const needSummary = !note.summary.trim();

  if (!needTags && !needSummary) return note;
  if (!isAnthropicConfigured()) return note;
  // Skip stubs / test crumbs — need real content to enrich
  if (note.body.trim().length < 40) return note;

  const suggestion = await suggestTagsAndSummary({
    title: note.title,
    folder: note.folder,
    body: note.body,
  });

  const tags = needTags ? suggestion.tags : note.tags;
  const summary = needSummary ? suggestion.summary : note.summary;

  if (
    tags.length === note.tags.length &&
    tags.every((t, i) => t === note.tags[i]) &&
    summary === note.summary
  ) {
    return note;
  }

  const raw = await readFile(path.join(vaultDir, notePath), 'utf-8');
  const parsed = parseVaultFile(notePath, raw);
  const frontmatter = {
    ...parsed.frontmatter,
    tags,
    summary,
  };

  await writeFile(
    path.join(vaultDir, notePath),
    serializeNote(frontmatter, parsed.body),
    'utf-8',
  );

  return getNote(vaultDir, notePath);
}
