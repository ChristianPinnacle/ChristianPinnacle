import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from './embed';
import { buildCitations } from './ask';
import type { RetrievedChunk } from './retrieve';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 for empty or mismatched lengths', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
  });
});

describe('buildCitations', () => {
  it('dedupes by path keeping highest score', () => {
    const chunks: RetrievedChunk[] = [
      { path: 'projects/a.md', chunkIdx: 0, text: 'first', score: 0.4 },
      { path: 'projects/a.md', chunkIdx: 1, text: 'better', score: 0.9 },
      { path: 'areas/b.md', chunkIdx: 0, text: 'other', score: 0.7 },
    ];

    const citations = buildCitations(chunks);
    expect(citations).toHaveLength(2);
    expect(citations[0]?.path).toBe('projects/a.md');
    expect(citations[0]?.excerpt).toBe('better');
    expect(citations[0]?.score).toBe(0.9);
  });
});
