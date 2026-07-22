/**
 * Single-user PIN lock (Candice pattern).
 * APP_PIN_HASH unset → auth disabled (local/dev).
 * Cookie: sa_session (httpOnly, signed via HMAC).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'sa_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;

export { COOKIE_NAME, SESSION_TTL_MS };

export function isPinConfigured(): boolean {
  return Boolean(process.env.APP_PIN_HASH?.trim());
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  // Dev fallback — production must set SESSION_SECRET
  return 'saiyan-dev-session-secret-change-me';
}

/** Format: scrypt$saltHex$hashHex */
export function hashPin(pin: string, salt?: Buffer): string {
  const saltBuf = salt ?? randomBytes(16);
  const hash = scryptSync(pin, saltBuf, SCRYPT_KEYLEN);
  return `scrypt$${saltBuf.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const saltHex = parts[1];
  const hashHex = parts[2];
  if (!saltHex || !hashHex) return false;

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(pin, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken(now = Date.now()): string {
  const exp = now + SESSION_TTL_MS;
  const payload = `ok:${exp}`;
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const match = /^ok:(\d+)$/.exec(payload);
  if (!match?.[1]) return false;
  const exp = Number(match[1]);
  return Number.isFinite(exp) && exp > now;
}

export function unlockWithPin(pin: string): { ok: true; token: string } | { ok: false; reason: string } {
  if (!isPinConfigured()) {
    return { ok: true, token: createSessionToken() };
  }
  const stored = process.env.APP_PIN_HASH!.trim();
  if (!verifyPin(pin, stored)) {
    return { ok: false, reason: 'Wrong PIN' };
  }
  return { ok: true, token: createSessionToken() };
}
