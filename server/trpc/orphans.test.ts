import { existsSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

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
    const created = await caller.notes.create({
      title: 'Orphan Quarantine Probe',
      folder: 'projects',
      body: 'Isolated probe note with enough body text to exist as a real file.',
      tags: ['test'],
      summary: 'Temporary orphan probe.',
    });

    expect(created.path.startsWith('projects/')).toBe(true);

    const listed = await caller.orphans.list();
    const found = listed.quarantine.find((o) => o.path === created.path);
    expect(found).toBeDefined();

    const moved = await caller.orphans.quarantine({ path: created.path });
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
  // Cleanup if prior run left the probe behind
  const probe = path.join(VAULT_DIR, 'unsorted/orphan-quarantine-probe.md');
  const probeProj = path.join(VAULT_DIR, 'projects/orphan-quarantine-probe.md');
  const { unlink } = await import('node:fs/promises');
  for (const p of [probe, probeProj]) {
    try {
      await unlink(p);
    } catch {
      // ignore
    }
  }
});

