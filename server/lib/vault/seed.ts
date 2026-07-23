import { existsSync } from 'node:fs';
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

/** True if `dir` (recursively) contains at least one `.md` file. */
async function hasMarkdown(dir: string): Promise<boolean> {
  const stack: string[] = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue; // dir missing / unreadable — treat as empty
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name));
      } else if (entry.name.endsWith('.md')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Seed the live vault from a baked-in copy on first boot.
 *
 * On Railway the vault lives on a persistent volume mounted at `/app/vault`,
 * which starts empty and shadows anything baked into the image at that path.
 * We ship the notes at `vault-seed/` instead and copy them across only when
 * the live vault has no markdown yet — so real deploys start with content and
 * later redeploys never clobber the user's notes.
 *
 * No-ops safely when the seed dir is absent (local dev) or the vault already
 * has notes. Returns true only when a copy actually happened.
 */
export async function seedVaultIfEmpty(
  vaultDir: string,
  seedDir: string,
): Promise<boolean> {
  if (!existsSync(seedDir)) return false; // nothing baked in (local dev)
  if (await hasMarkdown(vaultDir)) return false; // already populated
  if (path.resolve(vaultDir) === path.resolve(seedDir)) return false; // same dir

  await mkdir(vaultDir, { recursive: true });
  await cp(seedDir, vaultDir, { recursive: true });
  return true;
}
