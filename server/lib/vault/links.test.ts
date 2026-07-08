import { describe, expect, it } from 'vitest';
import { buildVaultIndex } from './indexer';
import { parseVaultFile } from './parse';
import type { ParsedNote } from './types';

function makeNote(
  path: string,
  title: string,
  folder: ParsedNote['frontmatter']['folder'],
  body: string,
): ParsedNote {
  return parseVaultFile(
    path,
    `---
title: ${title}
folder: ${folder}
tags: []
created: 2026-07-08
updated: 2026-07-08
source: user
summary: test
---
${body}`,
  );
}

describe('buildVaultIndex link extraction', () => {
  it('resolves wikilinks by note title', () => {
    const notes = [
      makeNote('a.md', 'Note A', 'projects', 'links to [[Note B]]'),
      makeNote('b.md', 'Note B', 'projects', 'target'),
    ];

    const index = buildVaultIndex(notes);

    expect(index.links).toEqual([
      {
        sourcePath: 'a.md',
        targetPath: 'b.md',
        type: 'wiki',
      },
    ]);
    expect(index.unresolvedLinks).toEqual([]);
  });

  it('tracks unresolved wikilinks', () => {
    const notes = [makeNote('a.md', 'Note A', 'projects', 'links to [[Missing]]')];
    const index = buildVaultIndex(notes);

    expect(index.links).toEqual([]);
    expect(index.unresolvedLinks).toEqual([
      { sourcePath: 'a.md', target: 'Missing' },
    ]);
  });

  it('computes PL score from inbound links', () => {
    const notes = [
      makeNote('hub.md', 'Hub', 'projects', 'central'),
      makeNote('a.md', 'Note A', 'projects', 'see [[Hub]]'),
      makeNote('b.md', 'Note B', 'projects', 'also [[Hub]]'),
    ];

    const index = buildVaultIndex(notes);
    const hub = index.notes.find((note) => note.path === 'hub.md');

    expect(hub?.plScore).toBeGreaterThan(500);
  });
});
