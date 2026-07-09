import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseVaultFile } from './parse';
import { VALID_FOLDERS, type VaultFrontmatter } from './types';

export type NoteRecord = {
  path: string;
  title: string;
  folder: string;
  tags: string[];
  created: string;
  updated: string;
  source: string;
  summary: string;
  body: string;
};

export type NoteFolder = (typeof VALID_FOLDERS)[number];

export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'note';
}

function yamlScalar(value: string): string {
  if (/[:#\[\]{}|>&*!?,]/.test(value) || value.includes('\n')) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function serializeNote(frontmatter: VaultFrontmatter, body: string): string {
  const tagItems = frontmatter.tags.map((tag) => yamlScalar(tag)).join(', ');
  const tagsLine = frontmatter.tags.length > 0 ? `tags: [${tagItems}]` : 'tags: []';
  const trimmedBody = body.trim();

  return `---
title: ${yamlScalar(frontmatter.title)}
folder: ${frontmatter.folder}
${tagsLine}
created: ${frontmatter.created}
updated: ${frontmatter.updated}
source: ${frontmatter.source}
summary: ${yamlScalar(frontmatter.summary)}
---
${trimmedBody ? `${trimmedBody}\n` : ''}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function assertSafeNotePath(relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, '/');
  if (
    normalized.includes('..') ||
    normalized.startsWith('/') ||
    !normalized.endsWith('.md') ||
    normalized.startsWith('assets/')
  ) {
    throw new Error('Invalid note path');
  }
}

async function uniqueNotePath(
  folder: string,
  baseSlug: string,
  vaultDir: string,
  excludePath?: string,
): Promise<string> {
  const normalizedExclude = excludePath?.replace(/\\/g, '/');
  let candidate = `${folder}/${baseSlug}.md`;
  let suffix = 2;

  while (true) {
    if (normalizedExclude && candidate === normalizedExclude) {
      return candidate;
    }

    try {
      await access(path.join(vaultDir, candidate));
      candidate = `${folder}/${baseSlug}-${suffix}.md`;
      suffix += 1;
    } catch {
      return candidate;
    }
  }
}

export async function getNote(vaultDir: string, relativePath: string): Promise<NoteRecord> {
  assertSafeNotePath(relativePath);
  const raw = await readFile(path.join(vaultDir, relativePath), 'utf-8');
  const parsed = parseVaultFile(relativePath, raw);

  return {
    path: parsed.path,
    title: parsed.frontmatter.title,
    folder: parsed.frontmatter.folder,
    tags: parsed.frontmatter.tags,
    created: parsed.frontmatter.created,
    updated: parsed.frontmatter.updated,
    source: parsed.frontmatter.source,
    summary: parsed.frontmatter.summary,
    body: parsed.body,
  };
}

export type CreateNoteInput = {
  title: string;
  folder: NoteFolder;
  body: string;
  tags?: string[];
  summary?: string;
};

export async function createNote(vaultDir: string, input: CreateNoteInput): Promise<NoteRecord> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Title is required');
  }

  const slug = slugifyTitle(title);
  const notePath = await uniqueNotePath(input.folder, slug, vaultDir);
  const today = todayIso();

  const frontmatter: VaultFrontmatter = {
    title,
    folder: input.folder,
    tags: input.tags ?? [],
    created: today,
    updated: today,
    source: 'user',
    summary: input.summary?.trim() ?? '',
  };

  await mkdir(path.join(vaultDir, input.folder), { recursive: true });
  await writeFile(
    path.join(vaultDir, notePath),
    serializeNote(frontmatter, input.body),
    'utf-8',
  );

  return getNote(vaultDir, notePath);
}

export type UpdateNoteInput = {
  path: string;
  title: string;
  folder: NoteFolder;
  body: string;
  tags?: string[];
  summary?: string;
};

export async function updateNote(vaultDir: string, input: UpdateNoteInput): Promise<NoteRecord> {
  assertSafeNotePath(input.path);

  const title = input.title.trim();
  if (!title) {
    throw new Error('Title is required');
  }

  const existing = await getNote(vaultDir, input.path);
  const today = todayIso();
  const frontmatter: VaultFrontmatter = {
    title,
    folder: input.folder,
    tags: input.tags ?? existing.tags,
    created: existing.created,
    updated: today,
    source: 'user',
    summary: input.summary?.trim() ?? existing.summary,
  };

  const slug = slugifyTitle(title);
  const currentFolder = existing.path.split('/')[0] ?? input.folder;
  const currentSlug = path.basename(existing.path, '.md');
  let targetPath = input.path.replace(/\\/g, '/');

  if (input.folder !== currentFolder || slug !== currentSlug) {
    targetPath = await uniqueNotePath(input.folder, slug, vaultDir, input.path);
  }

  const content = serializeNote(frontmatter, input.body);
  const oldFullPath = path.join(vaultDir, input.path);
  const newFullPath = path.join(vaultDir, targetPath);

  if (targetPath !== input.path.replace(/\\/g, '/')) {
    await mkdir(path.dirname(newFullPath), { recursive: true });
    await writeFile(newFullPath, content, 'utf-8');
    await unlink(oldFullPath);
  } else {
    await writeFile(oldFullPath, content, 'utf-8');
  }

  return getNote(vaultDir, targetPath);
}

export async function deleteNote(
  vaultDir: string,
  relativePath: string,
): Promise<{ ok: true; path: string }> {
  assertSafeNotePath(relativePath);
  await unlink(path.join(vaultDir, relativePath));
  return { ok: true, path: relativePath };
}
