import { describe, expect, it } from 'vitest';
import { appRouter } from './router';

describe('health', () => {
  it('returns ok status with vault note count', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.health();

    expect(result.status).toBe('ok');
    expect(result.vaultNoteCount).toBe(5);
    expect(result.dbConfigured).toBe(false);
    expect(result.indexedNoteCount).toBeNull();
  });
});

describe('graph.get', () => {
  it('returns nodes and edges from vault', async () => {
    const caller = appRouter.createCaller({});
    const graph = await caller.graph.get();

    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.nodes.every((n) => typeof n.plScore === 'number')).toBe(true);
    expect(graph.nodes.every((n) => typeof n.folder === 'string')).toBe(true);
  });
});

describe('vault.list', () => {
  it('returns all sample vault notes with PL scores', async () => {
    const caller = appRouter.createCaller({});
    const notes = await caller.vault.list();

    expect(notes).toHaveLength(5);
    expect(notes.map((n) => n.title).sort()).toEqual([
      'MFP Campaign',
      'Marketing Playbook',
      'Pinnacle Coaching',
      'Q3 Growth Decision',
      'Quick Capture',
    ]);
    expect(notes.every((note) => typeof note.plScore === 'number')).toBe(true);
  });
});

describe('vault.get', () => {
  it('returns raw markdown for a valid note path', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.vault.get({ path: 'projects/mfp-campaign.md' });

    expect(result.content).toContain('MFP Campaign');
    expect(result.content).toContain('[[Marketing Playbook]]');
  });
});

describe('echo', () => {
  it('echoes the input message', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.echo({ message: 'over 9000' });

    expect(result.echoed).toBe('over 9000');
  });
});
