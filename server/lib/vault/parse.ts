import matter from 'gray-matter';
import { vaultFrontmatterSchema, type ParsedNote } from './types';

const WIKILINK_PATTERN = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return [raw.trim()];
  }
  return [];
}

export function extractWikilinks(content: string): string[] {
  const links = new Set<string>();
  const pattern = new RegExp(WIKILINK_PATTERN.source, 'g');

  for (const match of content.matchAll(pattern)) {
    const target = match[1]?.trim();
    if (target) {
      links.add(target);
    }
  }

  return [...links];
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('Invalid date in frontmatter');
}

export function parseVaultFile(relativePath: string, rawContent: string): ParsedNote {
  const { data, content } = matter(rawContent);
  const tags = normalizeTags(data.tags);

  const frontmatter = vaultFrontmatterSchema.parse({
    title: data.title,
    folder: data.folder,
    tags,
    created: normalizeDate(data.created),
    updated: normalizeDate(data.updated),
    source: data.source,
    summary: data.summary ?? '',
  });

  const body = content.trim();
  const wikilinks = extractWikilinks(rawContent);

  return {
    path: relativePath.replace(/\\/g, '/'),
    frontmatter,
    body,
    wikilinks,
    wordCount: countWords(body),
  };
}
