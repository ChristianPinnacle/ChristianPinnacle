import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildIndexFromVault } from './indexer';

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

describe('rebuild from vault', () => {
  it('indexes all sample notes from the vault directory', async () => {
    const index = await buildIndexFromVault(VAULT_DIR);

    expect(index.notes).toHaveLength(5);
    expect(index.notes.map((note) => note.title).sort()).toEqual([
      'MFP Campaign',
      'Marketing Playbook',
      'Pinnacle Coaching',
      'Q3 Growth Decision',
      'Quick Capture',
    ]);
  });

  it('extracts wiki edges between sample notes', async () => {
    const index = await buildIndexFromVault(VAULT_DIR);

    expect(index.links.length).toBeGreaterThan(0);
    expect(index.unresolvedLinks).toEqual([]);

    const mfpLinks = index.links.filter(
      (link) => link.sourcePath === 'projects/mfp-campaign.md',
    );
    expect(mfpLinks.map((link) => link.targetPath).sort()).toEqual([
      'resources/marketing-playbook.md',
      'warroom/q3-growth-decision.md',
    ]);
  });

  it('is deterministic across repeated rebuilds', async () => {
    const first = await buildIndexFromVault(VAULT_DIR);
    const second = await buildIndexFromVault(VAULT_DIR);

    expect(first).toEqual(second);
  });
});
