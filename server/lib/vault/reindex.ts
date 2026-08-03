/**
 * Full vault → derived-DB rebuild (notes_index, wiki links, embeddings).
 * Used by `npm run reindex` and the PIN-gated admin.reindex procedure.
 * Never auto-run on boot — embeddings wipe + re-embed the whole vault.
 */
import { getDb } from '../../db';
import { runMigrations } from '../../db/migrate';
import { isVoyageConfigured } from '../rag/embed';
import { embedVaultNotes } from '../rag/retrieve';
import { writeVaultIndex } from './db';
import { buildIndexFromVault } from './indexer';
import { VAULT_DIR } from '../paths';

export type ReindexResult = {
  noteCount: number;
  linkCount: number;
  unresolvedLinkCount: number;
  notesEmbedded: number;
  chunksWritten: number;
  embeddingsSkipped: boolean;
};

export async function reindexVaultFromDisk(
  vaultDir: string = VAULT_DIR,
): Promise<ReindexResult> {
  const db = getDb();
  if (!db) {
    throw new Error('DATABASE_URL is required to reindex');
  }

  await runMigrations();
  const index = await buildIndexFromVault(vaultDir);
  await writeVaultIndex(db, index);

  if (!isVoyageConfigured()) {
    return {
      noteCount: index.notes.length,
      linkCount: index.links.length,
      unresolvedLinkCount: index.unresolvedLinks.length,
      notesEmbedded: 0,
      chunksWritten: 0,
      embeddingsSkipped: true,
    };
  }

  const embedResult = await embedVaultNotes(db, vaultDir, index);
  return {
    noteCount: index.notes.length,
    linkCount: index.links.length,
    unresolvedLinkCount: index.unresolvedLinks.length,
    notesEmbedded: embedResult.notesEmbedded,
    chunksWritten: embedResult.chunksWritten,
    embeddingsSkipped: false,
  };
}
