/**
 * Weekly digest (backlog D9) — one Scouter summary of recent vault activity.
 *
 * Deliberately deterministic and LLM-free: it reports what the vault already
 * knows (recent notes, War Room changes, orphans, hubs) so it costs nothing to
 * run and always produces the same output for the same vault.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildIndexFromVault } from '../vault/indexer';
import { serializeNote } from '../vault/notes';
import { findOrphans } from '../vault/orphans';
import type { IndexNote, VaultIndex, VaultFrontmatter } from '../vault/types';

const WARROOM_FOLDER = 'warroom';
const DIGEST_WINDOW_DAYS = 7;
const MAX_LISTED_PER_SECTION = 10;

export type WeeklyDigest = {
  title: string;
  notePath: string;
  periodStart: string;
  periodEnd: string;
  recentNotes: IndexNote[];
  warroomNotes: IndexNote[];
  topHubs: IndexNote[];
  orphanCount: number;
  unresolvedLinkCount: number;
  noteCount: number;
  body: string;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function inboundCounts(index: VaultIndex): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of index.links) {
    counts.set(link.targetPath, (counts.get(link.targetPath) ?? 0) + 1);
  }
  return counts;
}

function listNotes(notes: IndexNote[]): string {
  if (notes.length === 0) return '_None._';

  const lines = notes
    .slice(0, MAX_LISTED_PER_SECTION)
    .map((note) => `- [[${note.title}]] — ${note.folder} · updated ${note.updated}`);

  if (notes.length > MAX_LISTED_PER_SECTION) {
    lines.push(`- …and ${notes.length - MAX_LISTED_PER_SECTION} more`);
  }

  return lines.join('\n');
}

export function buildWeeklyDigest(index: VaultIndex, now = new Date()): WeeklyDigest {
  const periodEnd = isoDate(now);
  const windowStart = new Date(now.getTime() - DIGEST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const periodStart = isoDate(windowStart);

  const recentNotes = index.notes
    .filter((note) => note.updated >= periodStart && note.updated <= periodEnd)
    .sort((a, b) => b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title));

  const warroomNotes = recentNotes.filter((note) => note.folder === WARROOM_FOLDER);

  const inbound = inboundCounts(index);
  const topHubs = [...index.notes]
    .sort((a, b) => b.plScore - a.plScore || a.title.localeCompare(b.title))
    .slice(0, 5);

  const orphans = findOrphans(index);
  const title = `Weekly Digest ${periodEnd}`;

  const body = `# ${title}

Vault activity for ${periodStart} → ${periodEnd}.

## Scouter readout
- Notes in vault: ${index.notes.length}
- Touched this week: ${recentNotes.length}
- War Room decisions touched: ${warroomNotes.length}
- Orphans awaiting triage: ${orphans.length}
- Unresolved wikilinks: ${index.unresolvedLinks.length}

## Touched this week
${listNotes(recentNotes)}

## War Room movement
${listNotes(warroomNotes)}

## Strongest hubs
${topHubs
  .map(
    (note) =>
      `- [[${note.title}]] — PL ${note.plScore.toLocaleString('en-US')} · ${
        inbound.get(note.path) ?? 0
      } inbound`,
  )
  .join('\n')}

## Needs attention
${
  orphans.length === 0
    ? '_No orphans. Every note is linked._'
    : orphans
        .slice(0, MAX_LISTED_PER_SECTION)
        .map((orphan) => `- [[${orphan.title}]] — ${orphan.folder} · no wiki links`)
        .join('\n')
}
`;

  return {
    title,
    notePath: `${WARROOM_FOLDER}/weekly-digest-${periodEnd}.md`,
    periodStart,
    periodEnd,
    recentNotes,
    warroomNotes,
    topHubs,
    orphanCount: orphans.length,
    unresolvedLinkCount: index.unresolvedLinks.length,
    noteCount: index.notes.length,
    body,
  };
}

export async function generateWeeklyDigest(
  vaultDir: string,
  now = new Date(),
): Promise<WeeklyDigest> {
  const index = await buildIndexFromVault(vaultDir);
  return buildWeeklyDigest(index, now);
}

/**
 * Write (or overwrite) this period's digest note. Overwriting is intentional:
 * re-running on the same day refreshes one note instead of piling up drafts.
 */
export async function writeWeeklyDigest(
  vaultDir: string,
  now = new Date(),
): Promise<WeeklyDigest> {
  const digest = await generateWeeklyDigest(vaultDir, now);

  const frontmatter: VaultFrontmatter = {
    title: digest.title,
    folder: WARROOM_FOLDER,
    tags: ['digest', 'review'],
    created: digest.periodEnd,
    updated: digest.periodEnd,
    source: 'claude-code',
    summary: `Vault activity ${digest.periodStart} to ${digest.periodEnd}: ${digest.recentNotes.length} notes touched, ${digest.orphanCount} orphans.`,
  };

  await mkdir(path.join(vaultDir, WARROOM_FOLDER), { recursive: true });
  await writeFile(
    path.join(vaultDir, digest.notePath),
    serializeNote(frontmatter, digest.body),
    'utf-8',
  );

  return digest;
}
