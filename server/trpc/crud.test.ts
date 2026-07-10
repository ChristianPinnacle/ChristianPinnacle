import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { appRouter } from './router';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

const createdPaths: string[] = [];

afterEach(async () => {
  for (const p of createdPaths.splice(0)) {
    const full = path.join(VAULT_DIR, p);
    if (existsSync(full)) await unlink(full);
  }
});

describe('vault.create', () => {
  it('creates a new note file in the vault', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.vault.create({
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

  it('rejects duplicate note paths', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.vault.create({
      title: 'Duplicate Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: '',
    });
    createdPaths.push(result.path);

    await expect(
      caller.vault.create({
        title: 'Duplicate Note',
        folder: 'unsorted',
        tags: [],
        summary: '',
        body: '',
      }),
    ).rejects.toThrow();
  });
});

describe('vault.update', () => {
  it('updates the body of an existing note', async () => {
    const caller = appRouter.createCaller({});
    const { path: notePath } = await caller.vault.create({
      title: 'Updatable Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: 'original body',
    });
    createdPaths.push(notePath);

    await caller.vault.update({ path: notePath, body: 'updated body' });

    const { content } = await caller.vault.get({ path: notePath });
    expect(content).toContain('updated body');
    expect(content).not.toContain('original body');
  });
});

describe('vault.delete', () => {
  it('removes the note file from the vault', async () => {
    const caller = appRouter.createCaller({});
    const { path: notePath } = await caller.vault.create({
      title: 'Deletable Note',
      folder: 'unsorted',
      tags: [],
      summary: '',
      body: 'to be deleted',
    });

    await caller.vault.delete({ path: notePath });
    expect(existsSync(path.join(VAULT_DIR, notePath))).toBe(false);
  });
});
