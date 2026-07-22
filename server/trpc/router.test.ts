import { describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

describe('health', () => {
  it('returns ok status with vault note count', async () => {
    const caller = appRouter.createCaller(testContext());
    const result = await caller.health();

    expect(result.status).toBe('ok');
    expect(result.vaultNoteCount).toBeGreaterThanOrEqual(11);
    expect(typeof result.dbConfigured).toBe('boolean');
    if (result.dbConfigured) {
      expect(result.indexedNoteCount === null || typeof result.indexedNoteCount === 'number').toBe(true);
    } else {
      expect(result.indexedNoteCount).toBeNull();
    }
  });
});

describe('vault.list', () => {
  it('returns all sample vault notes with PL scores', async () => {
    const caller = appRouter.createCaller(testContext());
    const notes = await caller.vault.list();

    expect(notes.length).toBeGreaterThanOrEqual(11);
    expect(notes.some((n) => n.title === 'MFP Campaign')).toBe(true);
    expect(notes.every((note) => typeof note.plScore === 'number')).toBe(true);
  });
});

describe('graph.get', () => {
  it('returns nodes, edges, and folders from the vault', async () => {
    const caller = appRouter.createCaller(testContext());
    const graph = await caller.graph.get();

    expect(graph.nodes.length).toBeGreaterThanOrEqual(11);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.folders.length).toBeGreaterThan(0);
    expect(graph.totalPl).toBeGreaterThan(0);
    expect(graph.nodes.every((node) => node.color && node.label)).toBe(true);
  });

  it('includes wiki edges between linked notes', async () => {
    const caller = appRouter.createCaller(testContext());
    const graph = await caller.graph.get();

    const linked = graph.edges.some(
      (edge) =>
        edge.source === 'projects/mfp-campaign.md' &&
        edge.target === 'resources/marketing-playbook.md',
    );
    expect(linked).toBe(true);
  });
});

describe('hud.get', () => {
  it('returns HUD payload with battle log and folder counts', async () => {
    const caller = appRouter.createCaller(testContext());
    const hud = await caller.hud.get();

    expect(hud.noteCount).toBeGreaterThanOrEqual(11);
    expect(hud.folders).toHaveLength(6);
    expect(hud.battleLog.length).toBeGreaterThanOrEqual(3);
    expect(hud.radarTargets.length).toBeGreaterThan(0);
    expect(hud.energyPercent).toBeGreaterThan(0);
    expect(hud.totalPl).toBeGreaterThan(0);
  });
});

describe('notes CRUD', () => {
  const testPath = 'unsorted/trpc-crud-test-note.md';

  it('creates, reads, updates, and deletes a note in the vault', async () => {
    const caller = appRouter.createCaller(testContext());

    const created = await caller.notes.create({
      title: 'TRPC CRUD Test Note',
      folder: 'unsorted',
      body: '# Draft\n\nCreated from test.',
      summary: 'Temporary CRUD test note.',
      tags: ['test'],
    });

    expect(created.path).toBe(testPath);
    expect(created.title).toBe('TRPC CRUD Test Note');

    const fetched = await caller.notes.get({ path: testPath });
    expect(fetched.body).toContain('Created from test.');

    const updated = await caller.notes.update({
      path: testPath,
      title: 'TRPC CRUD Test Note',
      folder: 'projects',
      body: '# Updated\n\nUpdated from test.',
      summary: 'Updated CRUD test note.',
      tags: ['test'],
    });

    expect(updated.path).toBe('projects/trpc-crud-test-note.md');
    expect(updated.folder).toBe('projects');

    const deleted = await caller.notes.delete({ path: 'projects/trpc-crud-test-note.md' });
    expect(deleted.ok).toBe(true);

    await expect(caller.notes.get({ path: 'projects/trpc-crud-test-note.md' })).rejects.toThrow();
  });
});

describe('echo', () => {
  it('echoes the input message', async () => {
    const caller = appRouter.createCaller(testContext());
    const result = await caller.echo({ message: 'over 9000' });

    expect(result.echoed).toBe('over 9000');
  });
});


