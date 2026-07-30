import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildVaultIndex } from '../vault/indexer';
import { parseVaultFile } from '../vault/parse';
import { validateVault } from '../vault/validate';
import { buildWeeklyDigest, writeWeeklyDigest } from './weeklyDigest';

const NOW = new Date('2026-07-30T09:00:00Z');
const roots: string[] = [];

function note(options: {
  title: string;
  folder: string;
  updated: string;
  body?: string;
}): string {
  return `---
title: ${options.title}
folder: ${options.folder}
tags: [test]
created: 2026-07-01
updated: ${options.updated}
source: user
summary: Test note.
---
${options.body ?? 'Body text.'}
`;
}

function indexOf(files: Array<{ path: string; raw: string }>) {
  return buildVaultIndex(files.map((file) => parseVaultFile(file.path, file.raw)));
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('buildWeeklyDigest', () => {
  it('reports notes touched in the last seven days and ignores older ones', () => {
    const index = indexOf([
      {
        path: 'projects/fresh.md',
        raw: note({ title: 'Fresh', folder: 'projects', updated: '2026-07-28' }),
      },
      {
        path: 'projects/stale.md',
        raw: note({ title: 'Stale', folder: 'projects', updated: '2026-05-01' }),
      },
    ]);

    const digest = buildWeeklyDigest(index, NOW);

    expect(digest.periodStart).toBe('2026-07-23');
    expect(digest.periodEnd).toBe('2026-07-30');
    expect(digest.recentNotes.map((n) => n.title)).toEqual(['Fresh']);
    expect(digest.notePath).toBe('warroom/weekly-digest-2026-07-30.md');

    // Hubs and orphans are all-time views, so only the weekly section
    // is expected to exclude the stale note.
    const touched = digest.body.slice(
      digest.body.indexOf('## Touched this week'),
      digest.body.indexOf('## War Room movement'),
    );
    expect(touched).toContain('[[Fresh]]');
    expect(touched).not.toContain('[[Stale]]');
  });

  it('separates War Room movement and counts orphans', () => {
    const index = indexOf([
      {
        path: 'warroom/decision.md',
        raw: note({
          title: 'B2B First',
          folder: 'warroom',
          updated: '2026-07-29',
          body: 'Linked to [[Hub Note]].',
        }),
      },
      {
        path: 'projects/hub-note.md',
        raw: note({ title: 'Hub Note', folder: 'projects', updated: '2026-07-29' }),
      },
      {
        path: 'resources/lonely.md',
        raw: note({ title: 'Lonely', folder: 'resources', updated: '2026-07-29' }),
      },
    ]);

    const digest = buildWeeklyDigest(index, NOW);

    expect(digest.warroomNotes.map((n) => n.title)).toEqual(['B2B First']);
    expect(digest.orphanCount).toBe(1);
    expect(digest.body).toContain('Orphans awaiting triage: 1');
  });

  it('states explicitly when there is no activity', () => {
    const index = indexOf([
      {
        path: 'projects/stale.md',
        raw: note({ title: 'Stale', folder: 'projects', updated: '2026-01-01' }),
      },
    ]);

    const digest = buildWeeklyDigest(index, NOW);

    expect(digest.recentNotes).toEqual([]);
    expect(digest.body).toContain('_None._');
  });
});

describe('writeWeeklyDigest', () => {
  it('writes a contract-valid note and refreshes it when re-run', async () => {
    const vaultDir = await mkdtemp(path.join(os.tmpdir(), 'saiyan-digest-'));
    roots.push(vaultDir);
    await mkdir(path.join(vaultDir, 'projects'), { recursive: true });
    await mkdir(path.join(vaultDir, 'warroom'), { recursive: true });
    await writeFile(
      path.join(vaultDir, 'projects', 'fresh.md'),
      note({ title: 'Fresh', folder: 'projects', updated: '2026-07-28' }),
    );

    const first = await writeWeeklyDigest(vaultDir, NOW);
    const validation = await validateVault(vaultDir);
    expect(validation.errors).toEqual([]);

    const written = await readFile(path.join(vaultDir, first.notePath), 'utf-8');
    expect(written).toContain('folder: warroom');
    expect(written).toContain('source: claude-code');
    expect(written).toContain('[[Fresh]]');

    // Re-running the same day must refresh one note, not create a second.
    const second = await writeWeeklyDigest(vaultDir, NOW);
    expect(second.notePath).toBe(first.notePath);
    const after = await validateVault(vaultDir);
    expect(after.errors).toEqual([]);
    expect(after.noteCount).toBe(2);
  });
});
