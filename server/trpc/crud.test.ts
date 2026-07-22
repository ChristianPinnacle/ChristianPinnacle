import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

const createdPaths: string[] = [];

afterEach(async () => {
  for (const p of createdPaths.splice(0)) {
    const full = path.join(VAULT_DIR, p);
    if (existsSync(full)) await unlink(full);
  }
});

describe('notes.create', () => {
  it('creates a new note file in the vault', async () => {
    const caller = appRouter.createCaller(testContext());
    const result = await caller.notes.create({
      title: 'Test CRUD Note',
      folder: 'unsorted',
      tags: ['test'],
      summary: 'A test note',
      body: '# Test\n\nHello vault.',
    });

    createdPaths.push(result.path);
    expect(result.title).toBe('Test CRUD Note');
    expect(existsSync(path.join(VAULT_DIR, result.path))).toBe(true);
  });

  it('creates a unique path when title already exists', async () => {
    const caller = appRouter.createCaller(testContext());
    const first = await caller.notes.create({
      title: 'Duplicate Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: '',
    });
    createdPaths.push(first.path);

    const second = await caller.notes.create({
      title: 'Duplicate Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: '',
    });
    createdPaths.push(second.path);

    expect(second.path).not.toBe(first.path);
    expect(existsSync(path.join(VAULT_DIR, second.path))).toBe(true);
  });
});

describe('notes.update', () => {
  it('updates the body of an existing note', async () => {
    const caller = appRouter.createCaller(testContext());
    const { path: notePath } = await caller.notes.create({
      title: 'Updatable Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: 'original body',
    });
    createdPaths.push(notePath);

    await caller.notes.update({
      path: notePath,
      title: 'Updatable Note',
      folder: 'unsorted',
      body: 'updated body',
    });

    const note = await caller.notes.get({ path: notePath });
    expect(note.body).toContain('updated body');
    expect(note.body).not.toContain('original body');
  });
});

describe('notes.delete', () => {
  it('removes the note file from the vault', async () => {
    const caller = appRouter.createCaller(testContext());
    const { path: notePath } = await caller.notes.create({
      title: 'Deletable Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: 'to be deleted',
    });

    await caller.notes.delete({ path: notePath });
    expect(existsSync(path.join(VAULT_DIR, notePath))).toBe(false);
  });
});

