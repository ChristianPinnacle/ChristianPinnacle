import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedVaultIfEmpty } from './seed';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'seed-test-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const NOTE = `---
title: Seed Note
folder: resources
tags: []
created: 2026-07-08
updated: 2026-07-08
source: import
summary: seeded
---
Body`;

describe('seedVaultIfEmpty', () => {
  it('copies seed notes into an empty vault', async () => {
    const seedDir = path.join(root, 'vault-seed', 'resources');
    await mkdir(seedDir, { recursive: true });
    await writeFile(path.join(seedDir, 'seed-note.md'), NOTE, 'utf-8');

    const vaultDir = path.join(root, 'vault');
    const seeded = await seedVaultIfEmpty(vaultDir, path.join(root, 'vault-seed'));

    expect(seeded).toBe(true);
    const copied = await readFile(
      path.join(vaultDir, 'resources', 'seed-note.md'),
      'utf-8',
    );
    expect(copied).toContain('title: Seed Note');
  });

  it('does not overwrite a vault that already has notes', async () => {
    const seedDir = path.join(root, 'vault-seed', 'resources');
    await mkdir(seedDir, { recursive: true });
    await writeFile(path.join(seedDir, 'seed-note.md'), NOTE, 'utf-8');

    const existingDir = path.join(root, 'vault', 'projects');
    await mkdir(existingDir, { recursive: true });
    await writeFile(path.join(existingDir, 'mine.md'), NOTE, 'utf-8');

    const seeded = await seedVaultIfEmpty(
      path.join(root, 'vault'),
      path.join(root, 'vault-seed'),
    );

    expect(seeded).toBe(false);
    // seed note must NOT have been copied in
    expect(existsSync(path.join(root, 'vault', 'resources', 'seed-note.md'))).toBe(
      false,
    );
  });

  it('no-ops when the seed dir is absent (local dev)', async () => {
    const seeded = await seedVaultIfEmpty(
      path.join(root, 'vault'),
      path.join(root, 'does-not-exist'),
    );
    expect(seeded).toBe(false);
  });
});
