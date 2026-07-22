import { describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';
import { hashPin } from '../lib/auth/pin';

describe('auth.status', () => {
  it('reports unlocked when PIN is not configured', async () => {
    const caller = appRouter.createCaller(testContext());
    const status = await caller.auth.status();
    expect(status.unlocked).toBe(true);
  });
});

describe('auth.unlock', () => {
  it('rejects wrong PIN when hash is set', async () => {
    const prev = process.env.APP_PIN_HASH;
    process.env.APP_PIN_HASH = hashPin('1357');

    try {
      const caller = appRouter.createCaller(
        testContext({ pinRequired: true, unlocked: false }),
      );
      await expect(caller.auth.unlock({ pin: '0000' })).rejects.toThrow(/PIN/i);
    } finally {
      if (prev === undefined) delete process.env.APP_PIN_HASH;
      else process.env.APP_PIN_HASH = prev;
    }
  });
});
