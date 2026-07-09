import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import {
  createNote,
  deleteNote,
  getNote,
  serializeNote,
  slugifyTitle,
  updateNote,
} from './notes';
import type { VaultFrontmatter } from './types';

describe('serializeNote', () => {
  it('writes valid frontmatter and body', () => {
    const frontmatter: VaultFrontmatter = {
      title: 'Test Note',
      folder: 'projects',
      tags: ['alpha'],
      created: '2026-07-08',
      updated: '2026-07-08',
      source: 'user',
      summary: 'A test note.',
    };

    const raw = serializeNote(frontmatter, '# Hello\n\nBody text.');
    expect(raw).toContain('title: Test Note');
    expect(raw).toContain('folder: projects');
    expect(raw).toContain('# Hello');
  });
});

describe('slugifyTitle', () => {
  it('creates filesystem-safe slugs', () => {
    expect(slugifyTitle('MFP Campaign')).toBe('mfp-campaign');
    expect(slugifyTitle('  Hello: World!  ')).toBe('hello-world');
  });
});

describe('note CRUD', () => {
  let tmpDir = '';

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = '';
    }
  });

  it('creates, reads, updates, and deletes a note', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'saiyan-notes-'));

    const created = await createNote(tmpDir, {
      title: 'Session Test Note',
      folder: 'unsorted',
      body: '# Draft\n\nFirst version.',
      summary: 'Temporary test note.',
    });

    expect(created.path).toBe('unsorted/session-test-note.md');
    expect(created.title).toBe('Session Test Note');

    const raw = await readFile(path.join(tmpDir, created.path), 'utf-8');
    expect(raw).toContain('source: user');
    expect(raw).toContain('First version.');

    const updated = await updateNote(tmpDir, {
      path: created.path,
      title: 'Session Test Note',
      folder: 'projects',
      body: '# Updated\n\nSecond version with [[MFP Campaign]].',
      summary: 'Updated summary.',
    });

    expect(updated.path).toBe('projects/session-test-note.md');
    expect(updated.folder).toBe('projects');
    expect(updated.body).toContain('Second version');

    const fetched = await getNote(tmpDir, updated.path);
    expect(fetched.title).toBe('Session Test Note');

    await deleteNote(tmpDir, updated.path);
    await expect(getNote(tmpDir, updated.path)).rejects.toThrow();
  });
});
