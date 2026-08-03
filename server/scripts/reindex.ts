import 'dotenv/config';
import { closeDb, getDb } from '../db';
import { VAULT_DIR } from '../lib/paths';
import { reindexVaultFromDisk } from '../lib/vault/reindex';
import { buildIndexFromVault } from '../lib/vault/indexer';

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

  if (!getDb()) {
    console.log('[reindex] DATABASE_URL not set — parsed vault only, nothing written to DB.');
    return;
  }

  const result = await reindexVaultFromDisk(VAULT_DIR);
  console.log(
    `[reindex] Database rebuilt — ${result.noteCount} notes, ${result.linkCount} wiki links.`,
  );

  if (result.embeddingsSkipped) {
    console.log('[reindex] VOYAGE_API_KEY not set — skipped embeddings.');
  } else {
    console.log(
      `[reindex] Embeddings — ${result.notesEmbedded} notes, ${result.chunksWritten} chunks.`,
    );
  }

  await closeDb();
}

main().catch((err: unknown) => {
  console.error('[reindex] Failed:', err);
  process.exit(1);
});
