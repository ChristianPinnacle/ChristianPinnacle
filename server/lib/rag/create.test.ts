import { describe, expect, it } from 'vitest';
import {
  mergeCreateChunks,
  parseCreateDraft,
  suggestTitleFromBrief,
  type CREATE_ANCHOR_PATHS,
} from './create';
import type { RetrievedChunk } from './retrieve';

describe('parseCreateDraft', () => {
  it('extracts TITLE and DRAFT', () => {
    const parsed = parseCreateDraft(
      'TITLE: VitalEdge Hook\nDRAFT:\n# Hook\n\nDirect bloodwork-led line.',
    );
    expect(parsed.title).toBe('VitalEdge Hook');
    expect(parsed.draft).toContain('# Hook');
  });
});

describe('suggestTitleFromBrief', () => {
  it('uses first sentence fragment', () => {
    expect(suggestTitleFromBrief('Write an ad for MFP. Keep it short.')).toBe(
      'Write an ad for MFP',
    );
  });
});

describe('mergeCreateChunks', () => {
  it('keeps anchor paths first and dedupes', () => {
    const anchors: RetrievedChunk[] = [
      {
        path: 'resources/pinnacle-soul-file.md',
        chunkIdx: 0,
        text: 'voice',
        score: 1,
      },
    ];
    const retrieved: RetrievedChunk[] = [
      {
        path: 'projects/mfp-campaign.md',
        chunkIdx: 0,
        text: 'ads',
        score: 0.9,
      },
      {
        path: 'resources/pinnacle-soul-file.md',
        chunkIdx: 0,
        text: 'voice',
        score: 0.5,
      },
    ];

    const merged = mergeCreateChunks(retrieved, anchors, 8);
    expect(merged[0]?.path).toBe('resources/pinnacle-soul-file.md');
    expect(merged.filter((c) => c.path === 'resources/pinnacle-soul-file.md')).toHaveLength(1);
    expect(merged.some((c) => c.path === 'projects/mfp-campaign.md')).toBe(true);

    // type smoke — anchors list includes soul file
    const anchorsList: readonly string[] = [
      'resources/pinnacle-soul-file.md',
      'resources/marketing-playbook.md',
    ] satisfies typeof CREATE_ANCHOR_PATHS;
    expect(anchorsList).toHaveLength(2);
  });
});
