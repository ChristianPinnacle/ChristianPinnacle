import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseVaultFile } from './parse';
import { computePlScore } from './plScore';
import type { ParsedNote, VaultIndex } from './types';

export function resolveWikilinkTarget(
  target: string,
  titleToPath: Map<string, string>,
): string | null {
  const normalized = target.trim().toLowerCase();
  return titleToPath.get(normalized) ?? null;
}

export function buildVaultIndex(notes: ParsedNote[]): VaultIndex {
  const titleToPath = new Map<string, string>();

  for (const note of notes) {
    titleToPath.set(note.frontmatter.title.toLowerCase(), note.path);
  }

  const inboundCounts = new Map<string, number>();
  const links: VaultIndex['links'] = [];
  const unresolvedLinks: VaultIndex['unresolvedLinks'] = [];

  for (const note of notes) {
    for (const target of note.wikilinks) {
      const targetPath = resolveWikilinkTarget(target, titleToPath);
      if (!targetPath) {
        unresolvedLinks.push({ sourcePath: note.path, target });
        continue;
      }

      links.push({
        sourcePath: note.path,
        targetPath,
        type: 'wiki',
      });
      inboundCounts.set(targetPath, (inboundCounts.get(targetPath) ?? 0) + 1);
    }
  }

  const indexedNotes = notes.map((note) => ({
    path: note.path,
    title: note.frontmatter.title,
    folder: note.frontmatter.folder,
    updated: note.frontmatter.updated,
    wordCount: note.wordCount,
    plScore: computePlScore(
      note.wordCount,
      inboundCounts.get(note.path) ?? 0,
      note.frontmatter.updated,
    ),
  }));

  return {
    notes: indexedNotes,
    links,
    unresolvedLinks,
  };
}

export async function scanVault(vaultDir: string): Promise<ParsedNote[]> {
  const notes: ParsedNote[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(vaultDir, fullPath).replace(/\\/g, '/');
        try {
          const rawContent = await readFile(fullPath, 'utf-8');
          notes.push(parseVaultFile(relativePath, rawContent));
        } catch (err) {
          // Skip files deleted mid-scan (parallel tests / editor races)
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        }
      }
    }
  }

  await walk(vaultDir);
  notes.sort((a, b) => a.path.localeCompare(b.path));
  return notes;
}

export async function buildIndexFromVault(vaultDir: string): Promise<VaultIndex> {
  const notes = await scanVault(vaultDir);
  return buildVaultIndex(notes);
}
