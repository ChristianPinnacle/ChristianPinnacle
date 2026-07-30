import path from 'node:path';

/**
 * Single place that resolves on-disk locations, so a deploy can mount the vault
 * volume somewhere other than `/app/vault` by setting `VAULT_DIR`.
 */
function fromEnvOrCwd(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed
    ? path.resolve(trimmed)
    : path.resolve(process.cwd(), fallback);
}

export const VAULT_DIR = fromEnvOrCwd(process.env.VAULT_DIR, 'vault');
export const SEED_DIR = fromEnvOrCwd(process.env.VAULT_SEED_DIR, 'vault-seed');
export const CLIENT_DIST = fromEnvOrCwd(process.env.CLIENT_DIST_DIR, 'dist/client');
export const MIGRATIONS_DIR = fromEnvOrCwd(
  process.env.MIGRATIONS_DIR,
  'server/db/migrations',
);
export const PORTRAIT_PATH = path.join(VAULT_DIR, 'assets', 'portrait.png');
