import path from 'node:path';
import { validateVault } from '../lib/vault/validate';

const vaultDir = path.resolve(
  process.env.VAULT_DIR?.trim() || path.join(process.cwd(), 'vault'),
);

async function main(): Promise<void> {
  const result = await validateVault(vaultDir);

  for (const issue of result.errors) {
    console.error(`[vault:error] ${issue.path}: ${issue.message}`);
  }
  for (const issue of result.warnings) {
    console.warn(`[vault:warning] ${issue.path}: ${issue.message}`);
  }

  console.log(
    `[vault] ${result.noteCount} notes · ${result.errors.length} errors · ` +
      `${result.warnings.length} warnings`,
  );

  if (!result.valid) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(
    '[vault] Validation failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
