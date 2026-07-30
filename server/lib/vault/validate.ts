import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildVaultIndex } from './indexer';
import { parseVaultFile } from './parse';
import type { ParsedNote } from './types';

export type VaultValidationIssue = {
  path: string;
  message: string;
};

export type VaultValidationResult = {
  valid: boolean;
  noteCount: number;
  errors: VaultValidationIssue[];
  warnings: VaultValidationIssue[];
};

export async function validateVault(
  vaultDir: string,
): Promise<VaultValidationResult> {
  const notes: ParsedNote[] = [];
  const errors: VaultValidationIssue[] = [];
  const warnings: VaultValidationIssue[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const relativePath = path
        .relative(vaultDir, fullPath)
        .replace(/\\/g, '/');

      try {
        const raw = await readFile(fullPath, 'utf-8');
        notes.push(parseVaultFile(relativePath, raw));
      } catch (error) {
        errors.push({
          path: relativePath,
          message:
            error instanceof Error ? error.message : 'Unknown parse error',
        });
      }
    }
  }

  await walk(vaultDir);

  const titlePaths = new Map<string, string>();
  for (const note of notes) {
    const normalizedTitle = note.frontmatter.title.trim().toLowerCase();
    const existingPath = titlePaths.get(normalizedTitle);
    if (existingPath) {
      errors.push({
        path: note.path,
        message: `Duplicate title "${note.frontmatter.title}" (also in ${existingPath})`,
      });
    } else {
      titlePaths.set(normalizedTitle, note.path);
    }

    const expectedFolder = note.path.split('/')[0];
    if (expectedFolder !== note.frontmatter.folder) {
      errors.push({
        path: note.path,
        message:
          `Frontmatter folder "${note.frontmatter.folder}" does not match ` +
          `path folder "${expectedFolder ?? ''}"`,
      });
    }
  }

  const index = buildVaultIndex(notes);
  for (const unresolved of index.unresolvedLinks) {
    warnings.push({
      path: unresolved.sourcePath,
      message: `Unresolved wikilink [[${unresolved.target}]]`,
    });
  }

  return {
    valid: errors.length === 0,
    noteCount: notes.length,
    errors,
    warnings,
  };
}
