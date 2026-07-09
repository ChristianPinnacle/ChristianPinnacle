import path from 'node:path';
import { scanVault } from '../vault/indexer';
import type { ParsedNote } from '../vault/types';

const AGENT_LABELS: Record<string, string> = {
  manus: 'MANUS',
  'claude-code': 'CLAUDE CODE',
  candice: 'CANDICE',
  import: 'IMPORT',
};

export type BattleLogEntry = {
  agent: string;
  action: string;
  timeAgo: string;
  path: string;
  updated: string;
  source: string;
};

function formatTimeAgo(updated: string, now: Date = new Date()): string {
  const updatedDate = new Date(`${updated}T12:00:00Z`);
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

function formatAction(note: ParsedNote): string {
  const summary = note.frontmatter.summary.trim();
  if (summary) {
    return summary.length > 42 ? `${summary.slice(0, 39)}…` : summary;
  }
  return `filed note → ${note.frontmatter.title}`;
}

export async function getBattleLog(vaultDir: string): Promise<BattleLogEntry[]> {
  const notes = await scanVault(vaultDir);

  return notes
    .filter((note) => note.frontmatter.source !== 'user')
    .sort((a, b) => b.frontmatter.updated.localeCompare(a.frontmatter.updated))
    .map((note) => ({
      agent: AGENT_LABELS[note.frontmatter.source] ?? note.frontmatter.source.toUpperCase(),
      action: formatAction(note),
      timeAgo: formatTimeAgo(note.frontmatter.updated),
      path: note.path,
      updated: note.frontmatter.updated,
      source: note.frontmatter.source,
    }));
}
