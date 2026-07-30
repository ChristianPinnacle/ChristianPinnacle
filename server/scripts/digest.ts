import 'dotenv/config';
import { VAULT_DIR } from '../lib/paths';
import { writeWeeklyDigest } from '../lib/digest/weeklyDigest';

async function main(): Promise<void> {
  const digest = await writeWeeklyDigest(VAULT_DIR);
  console.log(`[digest] Wrote ${digest.notePath}`);
  console.log(
    `[digest] ${digest.recentNotes.length} notes touched · ` +
      `${digest.warroomNotes.length} War Room · ${digest.orphanCount} orphans`,
  );
  console.log('[digest] Run `npm run reindex` to pick it up in the graph and RAG.');
}

void main().catch((error: unknown) => {
  console.error(
    '[digest] Failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
