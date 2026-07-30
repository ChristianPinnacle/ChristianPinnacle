import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCommitMessage,
  createDebouncedMirror,
  mirrorVaultOnce,
  parsePorcelain,
  readGitMirrorConfig,
  redactRemote,
} from './gitMirror';

const roots: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('readGitMirrorConfig', () => {
  it('is disabled by default', () => {
    const config = readGitMirrorConfig({});
    expect(config.enabled).toBe(false);
    expect(config.dryRun).toBe(false);
    expect(config.remote).toBeNull();
    expect(config.branch).toBe('main');
  });

  it('reads the opt-in flags', () => {
    const config = readGitMirrorConfig({
      VAULT_GIT_SYNC: '1',
      VAULT_GIT_DRY_RUN: '1',
      VAULT_GIT_REMOTE: 'https://token@github.com/me/vault.git',
      VAULT_GIT_BRANCH: 'mirror',
    });
    expect(config.enabled).toBe(true);
    expect(config.dryRun).toBe(true);
    expect(config.branch).toBe('mirror');
  });
});

describe('redactRemote', () => {
  it('hides embedded credentials', () => {
    expect(redactRemote('https://ghp_secret@github.com/me/vault.git')).toBe(
      'https://***@github.com/me/vault.git',
    );
    expect(redactRemote('git@github.com:me/vault.git')).toBe('git@github.com:me/vault.git');
  });
});

describe('parsePorcelain', () => {
  it('extracts paths and prefers rename destinations', () => {
    const files = parsePorcelain(
      [
        ' M projects/alpha.md',
        '?? unsorted/new-note.md',
        'R  projects/old.md -> projects/new.md',
        '',
      ].join('\n'),
    );

    expect(files).toEqual([
      'projects/alpha.md',
      'unsorted/new-note.md',
      'projects/new.md',
    ]);
  });
});

describe('buildCommitMessage', () => {
  const now = new Date('2026-07-30T09:15:00Z');

  it('names the file when only one changed', () => {
    expect(buildCommitMessage(['projects/alpha.md'], now)).toBe(
      'vault: update projects/alpha.md (2026-07-30 09:15)',
    );
  });

  it('counts files for larger syncs', () => {
    expect(buildCommitMessage(['a.md', 'b.md'], now)).toBe(
      'vault: sync 2 files (2026-07-30 09:15)',
    );
  });
});

describe('mirrorVaultOnce', () => {
  it('no-ops when disabled', async () => {
    await expect(
      mirrorVaultOnce('/nonexistent', readGitMirrorConfig({})),
    ).resolves.toEqual({ status: 'disabled' });
  });

  it('reports a missing remote instead of guessing one', async () => {
    await expect(
      mirrorVaultOnce('/nonexistent', readGitMirrorConfig({ VAULT_GIT_SYNC: '1' })),
    ).resolves.toEqual({ status: 'no-remote' });
  });

  it('dry-run detects changes without committing or pushing', async () => {
    const vaultDir = await mkdtemp(path.join(os.tmpdir(), 'saiyan-git-'));
    roots.push(vaultDir);

    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);
    await run('git', ['init'], { cwd: vaultDir });
    await writeFile(path.join(vaultDir, 'note.md'), 'body', 'utf-8');

    const result = await mirrorVaultOnce(
      vaultDir,
      readGitMirrorConfig({
        VAULT_GIT_SYNC: '1',
        VAULT_GIT_DRY_RUN: '1',
        VAULT_GIT_REMOTE: 'https://token@github.com/me/vault.git',
      }),
    );

    expect(result).toEqual({ status: 'dry-run', changedFiles: 1 });

    // Nothing was committed, so the change is still pending.
    const { stdout } = await run('git', ['status', '--porcelain'], { cwd: vaultDir });
    expect(stdout).toContain('note.md');
  });

  it('reports clean when the tree has no changes', async () => {
    const vaultDir = await mkdtemp(path.join(os.tmpdir(), 'saiyan-git-'));
    roots.push(vaultDir);

    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const run = promisify(execFile);
    await run('git', ['init'], { cwd: vaultDir });

    const result = await mirrorVaultOnce(
      vaultDir,
      readGitMirrorConfig({
        VAULT_GIT_SYNC: '1',
        VAULT_GIT_REMOTE: 'https://token@github.com/me/vault.git',
      }),
    );

    expect(result).toEqual({ status: 'clean' });
  });
});

describe('createDebouncedMirror', () => {
  it('collapses rapid changes into one run and ignores calls while disabled', () => {
    vi.useFakeTimers();

    const disabled = createDebouncedMirror('/nonexistent', readGitMirrorConfig({}), 1000);
    disabled.schedule();
    expect(vi.getTimerCount()).toBe(0);

    const enabled = createDebouncedMirror(
      '/nonexistent',
      readGitMirrorConfig({
        VAULT_GIT_SYNC: '1',
        VAULT_GIT_REMOTE: 'https://token@github.com/me/vault.git',
        VAULT_GIT_DRY_RUN: '1',
      }),
      1000,
    );

    enabled.schedule();
    enabled.schedule();
    enabled.schedule();
    expect(vi.getTimerCount()).toBe(1);

    enabled.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });
});
