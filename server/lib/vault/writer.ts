import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { VaultFrontmatter } from './types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function titleToFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'untitled'
  );
}

export function serializeNote(frontmatter: VaultFrontmatter, body: string): string {
  const tags =
    frontmatter.tags.length > 0
      ? `[${frontmatter.tags.map((t) => t.trim()).join(', ')}]`
      : '[]';

  const fm = [
    '---',
    `title: ${frontmatter.title}`,
    `folder: ${frontmatter.folder}`,
    `tags: ${tags}`,
    `created: ${frontmatter.created}`,
    `updated: ${frontmatter.updated}`,
    `source: ${frontmatter.source}`,
    `summary: ${frontmatter.summary}`,
    '---',
  ].join('\n');

  return `${fm}\n${body.trim()}\n`;
}

export async function writeNote(
  vaultDir: string,
  notePath: string,
  frontmatter: VaultFrontmatter,
  body: string,
): Promise<void> {
  const fullPath = path.join(vaultDir, notePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, serializeNote(frontmatter, body), 'utf-8');
}

export function buildNotePath(folder: string, title: string): string {
  return `${folder}/${titleToFilename(title)}.md`;
}

export function buildFrontmatter(
  title: string,
  folder: VaultFrontmatter['folder'],
  tags: string[],
  summary: string,
  existingCreated?: string,
): VaultFrontmatter {
  const now = today();
  return {
    title,
    folder,
    tags,
    created: existingCreated ?? now,
    updated: now,
    source: 'user',
    summary,
  };
}

export async function deleteNote(vaultDir: string, notePath: string): Promise<void> {
  const fullPath = path.join(vaultDir, notePath);
  await unlink(fullPath);
}
