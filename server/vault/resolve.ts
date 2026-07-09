import path from "node:path";
import type { ParsedNote } from "./types.js";

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type TitleIndex = Map<string, string>;

export function buildTitleIndex(notes: ParsedNote[]): TitleIndex {
  const index = new Map<string, string>();

  for (const note of notes) {
    const notePath = note.path.replace(/\\/g, "/");
    index.set(normalizeKey(note.frontmatter.title), notePath);

    const basename = path.basename(notePath, ".md");
    index.set(normalizeKey(basename), notePath);
    index.set(slugify(basename), notePath);
    index.set(slugify(note.frontmatter.title), notePath);
  }

  return index;
}

export function resolveWikilink(target: string, titleIndex: TitleIndex): string | null {
  const trimmed = target.trim();
  const candidates = [
    normalizeKey(trimmed),
    slugify(trimmed),
    normalizeKey(path.basename(trimmed, ".md")),
  ];

  for (const candidate of candidates) {
    const resolved = titleIndex.get(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}
