import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VAULT_DIR } from '../lib/paths';
import { appRouter } from './router';
import { testContext } from './testContext';

/**
 * These run against the real vault (the router is hard-wired to it), so the
 * write test cleans up the note it creates.
 */
const writtenPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    writtenPaths
      .splice(0)
      .map((relativePath) =>
        rm(path.join(VAULT_DIR, relativePath), { force: true }),
      ),
  );
});

describe('digest.preview', () => {
  it('summarizes vault activity without writing a note', async () => {
    const caller = appRouter.createCaller(testContext());
    const preview = await caller.digest.preview();

    expect(preview.notePath).toMatch(/^warroom\/weekly-digest-\d{4}-\d{2}-\d{2}\.md$/);
    expect(preview.periodStart < preview.periodEnd).toBe(true);
    expect(preview.body).toContain('## Scouter readout');
    expect(typeof preview.touchedCount).toBe('number');
    expect(typeof preview.orphanCount).toBe('number');
  });

  it('requires an unlocked session', async () => {
    const caller = appRouter.createCaller(
      testContext({ pinRequired: true, unlocked: false }),
    );
    await expect(caller.digest.preview()).rejects.toThrow(/PIN required/i);
  });
});

describe('digest.write', () => {
  it('writes the digest note into warroom', async () => {
    const caller = appRouter.createCaller(testContext());
    const result = await caller.digest.write();
    writtenPaths.push(result.path);

    expect(result.ok).toBe(true);
    expect(result.path).toContain('warroom/weekly-digest-');

    const notes = await caller.vault.list();
    expect(notes.some((note) => note.path === result.path)).toBe(true);
  });
});
