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

describe('echo', () => {
  it('echoes the input message', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.echo({ message: 'over 9000' });

    expect(result.echoed).toBe('over 9000');
  });
});
