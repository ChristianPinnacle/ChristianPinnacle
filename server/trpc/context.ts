import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { COOKIE_NAME, isPinConfigured, verifySessionToken } from '../lib/auth/pin';

export function createContext(opts: CreateExpressContextOptions) {
  const raw = opts.req.cookies?.[COOKIE_NAME] as string | undefined;
  const unlocked = !isPinConfigured() || verifySessionToken(raw);

  return {
    req: opts.req,
    res: opts.res,
    unlocked,
    pinRequired: isPinConfigured(),
  };
}

export type Context = ReturnType<typeof createContext>;
