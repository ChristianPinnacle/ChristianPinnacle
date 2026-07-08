import 'dotenv/config';
import path from 'node:path';
import { closeDb, getDb } from '../db';
import { writeVaultIndex } from '../lib/vault/db';
import { buildIndexFromVault } from '../lib/vault/indexer';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

async function main(): Promise<void> {
  const index = await buildIndexFromVault(VAULT_DIR);

  console.log(`[reindex] Vault scan complete — ${index.notes.length} notes found.`);
  console.log(`[reindex] Wikilinks resolved — ${index.links.length} edges.`);

  if (index.unresolvedLinks.length > 0) {
    console.log(`[reindex] Unresolved wikilinks — ${index.unresolvedLinks.length}:`);
    for (const unresolved of index.unresolvedLinks) {
      console.log(`  - ${unresolved.sourcePath} → [[${unresolved.target}]]`);
    }
  }

  const db = getDb();
  if (!db) {
    console.log('[reindex] DATABASE_URL not set — parsed vault only, nothing written to DB.');
    return;
  }

  await writeVaultIndex(db, index);
  console.log('[reindex] Database rebuilt from vault (notes_index + wiki links).');
  await closeDb();
}

main().catch((err: unknown) => {
  console.error('[reindex] Failed:', err);
  process.exit(1);
});
