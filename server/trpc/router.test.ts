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
  });
});

describe('vault.list', () => {
  it('returns all sample vault notes with PL scores', async () => {
    const caller = appRouter.createCaller({});
    const notes = await caller.vault.list();
    expect(notes).toHaveLength(5);
    expect(notes.every((n) => typeof n.plScore === 'number')).toBe(true);
  });
});

describe('vault.get', () => {
  it('returns raw markdown for a valid note path', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.vault.get({ path: 'projects/mfp-campaign.md' });
    expect(result.content).toContain('MFP Campaign');
  });
});

describe('vault.meta', () => {
  it('returns source and updated fields for all notes', async () => {
    const caller = appRouter.createCaller({});
    const meta = await caller.vault.meta();
    expect(meta).toHaveLength(5);
    expect(meta.every((n) => typeof n.source === 'string')).toBe(true);
    expect(meta.every((n) => typeof n.updated === 'string')).toBe(true);
    expect(meta.every((n) => typeof n.plScore === 'number')).toBe(true);
  });
});

describe('echo', () => {
  it('echoes the input message', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.echo({ message: 'over 9000' });
    expect(result.echoed).toBe('over 9000');
  });
});
