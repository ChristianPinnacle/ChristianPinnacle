import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  hashPin,
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
