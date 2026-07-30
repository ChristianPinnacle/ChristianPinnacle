import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateVault } from './validate';

const roots: string[] = [];

async function makeVault(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'saiyan-validate-'));
  roots.push(root);
  await mkdir(path.join(root, 'projects'), { recursive: true });
  await mkdir(path.join(root, 'resources'), { recursive: true });
  return root;
}

function note(options: {
  title: string;
  folder: string;
  body?: string;
}): string {
  return `---
title: ${options.title}
folder: ${options.folder}
tags: [test]
created: 2026-07-30
updated: 2026-07-30
source: claude-code
summary: Test note.
---
${options.body ?? 'Body'}
`;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('validateVault', () => {
  it('accepts valid notes and reports unresolved links as warnings', async () => {
    const vaultDir = await makeVault();
    await writeFile(
      path.join(vaultDir, 'projects', 'alpha.md'),
      note({
        title: 'Alpha',
        folder: 'projects',
        body: 'See [[Missing Note]].',
      }),
    );

    const result = await validateVault(vaultDir);

    expect(result.valid).toBe(true);
    expect(result.noteCount).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]?.message).toContain('Missing Note');
  });

  it('reports invalid frontmatter, duplicate titles, and folder mismatch', async () => {
    const vaultDir = await makeVault();
    await writeFile(
      path.join(vaultDir, 'projects', 'alpha.md'),
      note({ title: 'Same Title', folder: 'projects' }),
    );
    await writeFile(
      path.join(vaultDir, 'resources', 'duplicate.md'),
      note({ title: 'Same Title', folder: 'projects' }),
    );
    await writeFile(
      path.join(vaultDir, 'resources', 'invalid.md'),
      'No frontmatter',
    );

    const result = await validateVault(vaultDir);

    expect(result.valid).toBe(false);
    expect(result.errors.some((issue) => issue.message.includes('Duplicate'))).toBe(
      true,
    );
    expect(
      result.errors.some((issue) => issue.message.includes('does not match')),
    ).toBe(true);
    expect(result.errors.some((issue) => issue.path === 'resources/invalid.md')).toBe(
      true,
    );
  });
});
