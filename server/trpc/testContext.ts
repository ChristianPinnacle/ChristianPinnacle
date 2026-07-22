import type { Context } from './context';

/** Unlocked mock context for Vitest createCaller. */
export function testContext(overrides?: Partial<Context>): Context {
  return {
    unlocked: true,
    pinRequired: false,
    req: { cookies: {} } as Context['req'],
    res: {
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as unknown as Context['res'],
    ...overrides,
  };
}
