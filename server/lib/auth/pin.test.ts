import { describe, expect, it } from 'vitest';
import {
  assertAuthConfiguration,
  checkPinRateLimit,
  createSessionToken,
  hashPin,
  recordPinAttempt,
  verifyPin,
  verifySessionToken,
} from './pin';

describe('hashPin / verifyPin', () => {
  it('round-trips a PIN', () => {
    const stored = hashPin('2468');
    expect(verifyPin('2468', stored)).toBe(true);
    expect(verifyPin('0000', stored)).toBe(false);
  });
});

describe('session token', () => {
  it('accepts fresh tokens and rejects garbage', () => {
    const token = createSessionToken();
    expect(verifySessionToken(token)).toBe(true);
    expect(verifySessionToken('nope')).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });

  it('rejects expired tokens', () => {
    const token = createSessionToken(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(verifySessionToken(token)).toBe(false);
  });
});

describe('production configuration', () => {
  it('requires a session secret when PIN protection is enabled', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousPinHash = process.env.APP_PIN_HASH;
    const previousSessionSecret = process.env.SESSION_SECRET;

    process.env.NODE_ENV = 'production';
    process.env.APP_PIN_HASH = hashPin('2468');
    delete process.env.SESSION_SECRET;

    try {
      expect(() => assertAuthConfiguration()).toThrow(/SESSION_SECRET/);
      process.env.SESSION_SECRET = 'test-production-secret';
      expect(() => assertAuthConfiguration()).not.toThrow();
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousPinHash === undefined) delete process.env.APP_PIN_HASH;
      else process.env.APP_PIN_HASH = previousPinHash;
      if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
      else process.env.SESSION_SECRET = previousSessionSecret;
    }
  });
});

describe('PIN attempt rate limit', () => {
  it('blocks after five failures and resets on success', () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const now = Date.now();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(checkPinRateLimit(key, now)).toEqual({ allowed: true });
      recordPinAttempt(key, false, now);
    }

    expect(checkPinRateLimit(key, now)).toMatchObject({ allowed: false });
    recordPinAttempt(key, true, now);
    expect(checkPinRateLimit(key, now)).toEqual({ allowed: true });
  });
});
