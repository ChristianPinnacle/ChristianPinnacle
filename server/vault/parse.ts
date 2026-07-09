import matter from "gray-matter";
import { frontmatterSchema, type ParsedNote, type VaultFrontmatter } from "./types.js";

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

function normalizeFrontmatter(data: Record<string, unknown>): VaultFrontmatter {
  const normalized: Record<string, unknown> = { ...data };

  for (const key of ["created", "updated"] as const) {
    const value = normalized[key];
    if (value instanceof Date) {
      normalized[key] = value.toISOString().slice(0, 10);
    }
  }

  return frontmatterSchema.parse(normalized);
}

export function extractWikilinks(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(WIKILINK_RE)) {
    const target = match[1]?.trim();
    if (target) {
      found.add(target);
    }
  }
  return [...found];
}

export function countWords(text: string): number {
  const stripped = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/[#>*_\-\[\]()!]/g, " ")
    .trim();

  if (!stripped) {
    return 0;
  }

  return stripped.split(/\s+/).filter(Boolean).length;
}

export function parseNoteFile(relativePath: string, raw: string): ParsedNote {
  const parsed = matter(raw);
  const frontmatter = normalizeFrontmatter(parsed.data as Record<string, unknown>);
  const body = parsed.content.trim();
  const wikilinks = extractWikilinks(body);

  return {
    path: relativePath.replace(/\\/g, "/"),
    frontmatter,
    body,
    wikilinks,
    wordCount: countWords(body),
  };
}
