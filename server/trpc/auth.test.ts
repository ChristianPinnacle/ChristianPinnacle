import { describe, expect, it, vi } from 'vitest';
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

describe('pinGuard', () => {
  it('rejects protected procedures while locked but allows auth.status', async () => {
    const caller = appRouter.createCaller(
      testContext({ pinRequired: true, unlocked: false }),
    );

    await expect(caller.health()).rejects.toThrow(/PIN required/i);
    await expect(caller.vault.list()).rejects.toThrow(/PIN required/i);
    await expect(caller.auth.status()).resolves.toMatchObject({
      pinRequired: true,
      unlocked: false,
    });
  });
});

describe('auth.lock', () => {
  it('clears the session cookie', async () => {
    const clearCookie = vi.fn();
    const caller = appRouter.createCaller(
      testContext({
        res: {
          clearCookie,
        } as unknown as ReturnType<typeof testContext>['res'],
      }),
    );

    await expect(caller.auth.lock()).resolves.toEqual({ ok: true });
    expect(clearCookie).toHaveBeenCalledWith('sa_session', { path: '/' });
  });
});
