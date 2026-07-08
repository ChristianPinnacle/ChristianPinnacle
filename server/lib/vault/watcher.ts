import chokidar from 'chokidar';
import path from 'node:path';
import { getDb } from '../../db';
import { buildIndexFromVault } from './indexer';
import { writeVaultIndex } from './db';

const DEBOUNCE_MS = 500;

export function startVaultWatcher(vaultDir: string): chokidar.FSWatcher {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const runReindex = async (reason: string): Promise<void> => {
    const db = getDb();
    if (!db) {
      console.log(`[vault-watcher] ${reason} — skipped (DATABASE_URL not set)`);
      return;
    }

    try {
      const index = await buildIndexFromVault(vaultDir);
      await writeVaultIndex(db, index);
      console.log(
        `[vault-watcher] ${reason} — indexed ${index.notes.length} notes, ${index.links.length} links`,
      );
      if (index.unresolvedLinks.length > 0) {
        console.log(
          `[vault-watcher] ${index.unresolvedLinks.length} unresolved wikilinks`,
        );
      }
    } catch (err) {
      console.error('[vault-watcher] Reindex failed:', err);
    }
  };

  const scheduleReindex = (reason: string): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      void runReindex(reason);
    }, DEBOUNCE_MS);
  };

  const watcher = chokidar.watch(path.join(vaultDir, '**/*.md'), {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 50,
    },
  });

  watcher.on('add', (filePath) => scheduleReindex(`added ${path.basename(filePath)}`));
  watcher.on('change', (filePath) => scheduleReindex(`changed ${path.basename(filePath)}`));
  watcher.on('unlink', (filePath) => scheduleReindex(`removed ${path.basename(filePath)}`));

  console.log(`[vault-watcher] Watching ${vaultDir}`);
  return watcher;
}
