import { describe, expect, it } from 'vitest';
import { appRouter } from './router';

describe('health', () => {
  it('returns ok status with vault note count', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.health();

    expect(result.status).toBe('ok');
    expect(result.vaultNoteCount).toBe(5);
    expect(typeof result.dbConfigured).toBe('boolean');
  });
});

describe('vault.list', () => {
  it('returns all sample vault notes', async () => {
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
  });
});

describe('echo', () => {
  it('echoes the input message', async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.echo({ message: 'over 9000' });

    expect(result.echoed).toBe('over 9000');
  });
});
