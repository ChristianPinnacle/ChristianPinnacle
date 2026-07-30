/**
 * Vault → private Git mirror (backlog B1).
 *
 * The vault volume is the live copy; this mirrors it to a private repo so there
 * is an off-box backup and an Obsidian sync path. One-way only: this server is
 * the sole writer, so there is no merge/conflict handling by design.
 *
 * Disabled unless VAULT_GIT_SYNC=1. VAULT_GIT_DRY_RUN=1 logs the commands it
 * would run without touching the network — use that to verify configuration
 * before handing it real credentials.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const DEBOUNCE_MS = 5 * 60 * 1000;

export type GitMirrorConfig = {
  enabled: boolean;
  dryRun: boolean;
  remote: string | null;
  branch: string;
  authorName: string;
  authorEmail: string;
};

export type MirrorResult =
  | { status: 'disabled' }
  | { status: 'no-remote' }
  | { status: 'clean' }
  | { status: 'dry-run'; changedFiles: number }
  | { status: 'pushed'; changedFiles: number }
  | { status: 'failed'; error: string };

export function readGitMirrorConfig(
  env: NodeJS.ProcessEnv = process.env,
): GitMirrorConfig {
  return {
    enabled: env.VAULT_GIT_SYNC === '1',
    dryRun: env.VAULT_GIT_DRY_RUN === '1',
    remote: env.VAULT_GIT_REMOTE?.trim() || null,
    branch: env.VAULT_GIT_BRANCH?.trim() || 'main',
    authorName: env.VAULT_GIT_AUTHOR_NAME?.trim() || 'Saiyan Archive',
    authorEmail: env.VAULT_GIT_AUTHOR_EMAIL?.trim() || 'archive@localhost',
  };
}

/** Credentials can arrive inside the remote URL, so never log it verbatim. */
export function redactRemote(remote: string): string {
  return remote.replace(/\/\/[^@/]*@/, '//***@');
}

export function buildCommitMessage(changedFiles: string[], now = new Date()): string {
  const stamp = now.toISOString().replace('T', ' ').slice(0, 16);
  if (changedFiles.length === 1) {
    return `vault: update ${changedFiles[0]} (${stamp})`;
  }
  return `vault: sync ${changedFiles.length} files (${stamp})`;
}

export function parsePorcelain(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutStatus = line.slice(2).trim();
      // Renames are reported as "old -> new"; keep the destination.
      const arrow = withoutStatus.indexOf(' -> ');
      return arrow >= 0 ? withoutStatus.slice(arrow + 4) : withoutStatus;
    })
    .map((file) => file.replace(/^"|"$/g, ''));
}

async function git(vaultDir: string, args: string[]): Promise<string> {
  const { stdout } = await run('git', args, { cwd: vaultDir });
  return stdout;
}

/**
 * Commit and push whatever changed in the vault repo. Assumes `vaultDir` is
 * already a git working tree with `remote` configured; setup is a one-time
 * manual step so this never invents credentials.
 */
export async function mirrorVaultOnce(
  vaultDir: string,
  config: GitMirrorConfig = readGitMirrorConfig(),
  now = new Date(),
): Promise<MirrorResult> {
  if (!config.enabled) return { status: 'disabled' };
  if (!config.remote) return { status: 'no-remote' };

  try {
    const changedFiles = parsePorcelain(
      await git(vaultDir, ['status', '--porcelain']),
    );

    if (changedFiles.length === 0) return { status: 'clean' };

    if (config.dryRun) {
      console.log(
        `[vault-git] DRY RUN — would commit ${changedFiles.length} file(s) and push ` +
          `to ${redactRemote(config.remote)} (${config.branch})`,
      );
      return { status: 'dry-run', changedFiles: changedFiles.length };
    }

    await git(vaultDir, ['add', '--all']);
    await git(vaultDir, [
      '-c',
      `user.name=${config.authorName}`,
      '-c',
      `user.email=${config.authorEmail}`,
      'commit',
      '-m',
      buildCommitMessage(changedFiles, now),
    ]);
    await git(vaultDir, ['push', config.remote, `HEAD:${config.branch}`]);

    console.log(`[vault-git] Pushed ${changedFiles.length} file(s) to ${config.branch}`);
    return { status: 'pushed', changedFiles: changedFiles.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const safe = config.remote ? message.split(config.remote).join('***') : message;
    console.error('[vault-git] Mirror failed:', safe);
    return { status: 'failed', error: safe };
  }
}

/**
 * Debounced trigger for the file watcher: many rapid vault writes collapse into
 * a single commit ~5 minutes after the last change.
 */
export function createDebouncedMirror(
  vaultDir: string,
  config: GitMirrorConfig = readGitMirrorConfig(),
  debounceMs = DEBOUNCE_MS,
): { schedule: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule: () => {
      if (!config.enabled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void mirrorVaultOnce(vaultDir, config);
      }, debounceMs);
      timer.unref?.();
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
