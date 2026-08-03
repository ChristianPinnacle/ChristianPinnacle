import 'dotenv/config';
import { VAULT_DIR } from '../lib/paths';
import { isAnthropicConfigured } from '../lib/invokeLLM';
import { isTavilyConfigured } from '../lib/rag/research';
import { runDailyResearch } from '../lib/rag/dailyResearch';

async function main(): Promise<void> {
  if (!isTavilyConfigured() || !isAnthropicConfigured()) {
    console.error(
      '[research:daily] Needs TAVILY_API_KEY and ANTHROPIC_API_KEY in env.',
    );
    process.exitCode = 1;
    return;
  }

  const force = process.argv.includes('--force');
  const result = await runDailyResearch(VAULT_DIR, { force });

  if (result.skipped) {
    console.log(
      `[research:daily] Already ran for ${result.date} (${result.summaryPath}). ` +
        'Pass --force to overwrite.',
    );
    return;
  }

  console.log(
    `[research:daily] ${result.date}: filed ${result.notes.length} topic notes · ` +
      `${result.errors.length} failures`,
  );
  console.log(`[research:daily] Summary → ${result.summaryPath}`);
  for (const note of result.notes) {
    console.log(`  ✓ ${note.topic} → ${note.notePath}`);
  }
  for (const err of result.errors) {
    console.log(`  ✗ ${err.topic}: ${err.message}`);
  }
  console.log(
    '[research:daily] Run `npm run reindex` (or wait for watcher) so graph/RAG see the notes.',
  );
}

void main().catch((error: unknown) => {
  console.error(
    '[research:daily] Failed:',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
