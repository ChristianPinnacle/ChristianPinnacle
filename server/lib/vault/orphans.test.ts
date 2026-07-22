import { describe, expect, it } from 'vitest';
import { findOrphans, quarantineCandidates } from './orphans';
import type { VaultIndex } from './types';

function makeIndex(partial: Partial<VaultIndex> & { notes: VaultIndex['notes'] }): VaultIndex {
  return {
    links: partial.links ?? [],
    unresolvedLinks: partial.unresolvedLinks ?? [],
    notes: partial.notes,
  };
}

describe('findOrphans', () => {
  it('flags notes with zero wiki edges', () => {
    const index = makeIndex({
      notes: [
        {
          path: 'projects/linked.md',
          title: 'Linked',
          folder: 'projects',
          updated: '2026-07-08',
          wordCount: 10,
          plScore: 1000,
        },
        {
          path: 'projects/lonely.md',
          title: 'Lonely',
          folder: 'projects',
          updated: '2026-07-08',
          wordCount: 10,
          plScore: 500,
        },
        {
          path: 'unsorted/inbox.md',
          title: 'Inbox',
          folder: 'unsorted',
          updated: '2026-07-08',
          wordCount: 5,
          plScore: 400,
        },
        {
          path: 'archive/old.md',
          title: 'Old',
          folder: 'archive',
          updated: '2024-01-01',
          wordCount: 5,
          plScore: 100,
        },
      ],
      links: [
        {
          sourcePath: 'projects/linked.md',
          targetPath: 'unsorted/inbox.md',
          type: 'wiki',
        },
      ],
    });

    const orphans = findOrphans(index);
    expect(orphans.map((o) => o.path)).toEqual(['projects/lonely.md']);
    // lonely is quarantine candidate; inbox is linked so not orphan; archive excluded
    expect(quarantineCandidates(orphans)).toHaveLength(1);
    expect(quarantineCandidates(orphans)[0]?.alreadyUnsorted).toBe(false);
  });

  it('marks unsorted orphans as alreadyUnsorted', () => {
    const index = makeIndex({
      notes: [
        {
          path: 'unsorted/alone.md',
          title: 'Alone',
          folder: 'unsorted',
          updated: '2026-07-08',
          wordCount: 3,
          plScore: 400,
        },
      ],
    });

    const orphans = findOrphans(index);
    expect(orphans).toHaveLength(1);
    expect(orphans[0]?.alreadyUnsorted).toBe(true);
    expect(quarantineCandidates(orphans)).toHaveLength(0);
  });
});
