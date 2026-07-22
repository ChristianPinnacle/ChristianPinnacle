import { randomBytes } from 'node:crypto';
import { hashPin } from '../lib/auth/pin';

const pin = process.argv[2];
if (!pin || !/^\d{4,8}$/.test(pin)) {
  console.error('Usage: npx tsx server/scripts/hash-pin.ts <4-8 digit PIN>');
  process.exit(1);
}

const hashed = hashPin(pin);
console.log('\nAdd these to your .env:\n');
console.log(`APP_PIN_HASH=${hashed}`);
console.log(`SESSION_SECRET=${randomBytes(24).toString('hex')}`);
console.log('\n(Do not commit .env)\n');
