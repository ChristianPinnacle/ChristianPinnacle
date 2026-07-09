import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";
import type { Database } from "../db/index.js";
import { reindexVault } from "./reindex.js";

const DEBOUNCE_MS = 500;

export function startVaultWatcher(
  db: Database,
  vaultPath: string,
  onReindex?: (result: Awaited<ReturnType<typeof reindexVault>>) => void,
): FSWatcher {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let pending = false;

  const runReindex = async (): Promise<void> => {
    if (running) {
      pending = true;
      return;
    }

    running = true;
    try {
      const result = await reindexVault(db, vaultPath);
      onReindex?.(result);
      console.log(
        `[watcher] Reindexed ${result.noteCount} notes, ${result.linkCount} wiki links`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[watcher] Reindex failed: ${message}`);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        void runReindex();
      }
    }
  };

  const scheduleReindex = (): void => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      void runReindex();
    }, DEBOUNCE_MS);
  };

  const watcher = chokidar.watch(path.join(vaultPath, "**/*.md"), {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
  });

  watcher.on("add", scheduleReindex);
  watcher.on("change", scheduleReindex);
  watcher.on("unlink", scheduleReindex);

  watcher.on("error", (err) => {
    console.error(`[watcher] ${err instanceof Error ? err.message : String(err)}`);
  });

  return watcher;
}
