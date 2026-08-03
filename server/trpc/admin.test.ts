import { describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

describe('admin.reindex', () => {
  it('requires an unlocked session', async () => {
    const caller = appRouter.createCaller(
      testContext({ pinRequired: true, unlocked: false }),
    );
    await expect(
      caller.admin.reindex({ confirm: 'REINDEX' }),
    ).rejects.toThrow(/PIN required/i);
  });

  it('requires the exact confirm string', async () => {
    const caller = appRouter.createCaller(testContext());
    await expect(
      caller.admin.reindex({ confirm: 'YES' as 'REINDEX' }),
    ).rejects.toThrow();
  });
});
