/**
 * Full vault re-scan → parse links → re-embed changed files.
 * Stub for Task 1 scaffold; implemented in Task 2.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

async function countMarkdownFiles(dir: string): Promise<number> {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countMarkdownFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      count += 1;
    }
  }

  return count;
}

async function main(): Promise<void> {
  const noteCount = await countMarkdownFiles(VAULT_DIR);
  console.log(`[reindex] Vault scan complete — ${noteCount} notes found.`);
  console.log('[reindex] Full indexing not yet implemented (Task 2).');
}

main().catch((err: unknown) => {
  console.error('[reindex] Failed:', err);
  process.exit(1);
});
