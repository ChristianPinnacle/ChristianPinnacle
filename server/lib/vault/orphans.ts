/**
 * Orphan detection — notes with zero wiki links (in or out).
 * Quarantine moves them into unsorted (SCOUTER ERROR) for triage.
 */
import type { VaultIndex } from './types';
import { getNote, updateNote, type NoteRecord } from './notes';

export type OrphanNote = {
  path: string;
  title: string;
  folder: string;
  plScore: number;
  /** Already sitting in unsorted — no move needed. */
  alreadyUnsorted: boolean;
};

/** True isolates: no inbound and no outbound wiki edges. */
export function findOrphans(index: VaultIndex): OrphanNote[] {
  const connected = new Set<string>();
  for (const link of index.links) {
    connected.add(link.sourcePath);
    connected.add(link.targetPath);
  }

  return index.notes
    .filter((note) => !connected.has(note.path))
    .filter((note) => note.folder !== 'archive')
    .map((note) => ({
      path: note.path,
      title: note.title,
      folder: note.folder,
      plScore: note.plScore,
      alreadyUnsorted: note.folder === 'unsorted',
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** Orphans that still live in a “real” folder and should be filed to unsorted. */
export function quarantineCandidates(orphans: OrphanNote[]): OrphanNote[] {
  return orphans.filter((o) => !o.alreadyUnsorted);
}

export async function quarantineOrphan(
  vaultDir: string,
  notePath: string,
): Promise<NoteRecord> {
  const note = await getNote(vaultDir, notePath);
  if (note.folder === 'unsorted') {
    return note;
  }
  if (note.folder === 'archive') {
    throw new Error('Archive notes are not quarantined');
  }

  return updateNote(vaultDir, {
    path: notePath,
    title: note.title,
    folder: 'unsorted',
    body: note.body,
    tags: note.tags,
    summary: note.summary,
  });
}
