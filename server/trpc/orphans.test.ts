import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');
const createdPaths: string[] = [];

describe('orphans.list', () => {
  it('returns orphans and quarantine candidates', async () => {
    const caller = appRouter.createCaller(testContext());
    const result = await caller.orphans.list();

    expect(Array.isArray(result.orphans)).toBe(true);
    expect(Array.isArray(result.quarantine)).toBe(true);
    expect(result.quarantine.every((o) => !o.alreadyUnsorted)).toBe(true);
    expect(result.quarantine.every((o) => o.folder !== 'archive')).toBe(true);
  });
});

describe('orphans.quarantine', () => {
  it('moves an isolated note into unsorted', async () => {
    const caller = appRouter.createCaller(testContext());
    const stamp = Date.now();
    const created = await caller.notes.create({
      title: `Orphan Quarantine Probe ${stamp}`,
      folder: 'projects',
      // Keep the body short of the enrich threshold so Claude cannot inject
      // wikilinks that would take this note out of the orphan set.
      body: 'Isolated probe.',
      tags: ['test'],
      summary: 'Temporary orphan probe.',
    });
    createdPaths.push(created.path);

    expect(created.path.startsWith('projects/')).toBe(true);

    const moved = await caller.orphans.quarantine({ path: created.path });
    createdPaths.push(moved.path);

    expect(moved.folder).toBe('unsorted');
    expect(moved.path.startsWith('unsorted/')).toBe(true);
    expect(existsSync(path.join(VAULT_DIR, created.path))).toBe(false);
    expect(existsSync(path.join(VAULT_DIR, moved.path))).toBe(true);

    await caller.notes.delete({ path: moved.path });
  });
});

describe('hud orphanCount', () => {
  it('reports orphanCount on hud.get', async () => {
    const caller = appRouter.createCaller(testContext());
    const hud = await caller.hud.get();
    expect(typeof hud.orphanCount).toBe('number');
    expect(hud.orphanCount).toBeGreaterThanOrEqual(0);
  });
});

afterAll(async () => {
  for (const relative of createdPaths) {
    try {
      await unlink(path.join(VAULT_DIR, relative));
    } catch {
      // ignore
    }
  }
});
