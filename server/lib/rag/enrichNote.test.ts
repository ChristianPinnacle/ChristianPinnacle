import { describe, expect, it } from 'vitest';
import { parseEnrichmentResponse } from './enrichNote';

describe('parseEnrichmentResponse', () => {
  it('parses clean JSON', () => {
    const result = parseEnrichmentResponse(
      '{"tags":["vitaledge","marketing"],"summary":"Campaign plan for MFP."}',
    );
    expect(result.tags).toEqual(['vitaledge', 'marketing']);
    expect(result.summary).toBe('Campaign plan for MFP.');
  });

  it('strips markdown fences and normalizes tags', () => {
    const result = parseEnrichmentResponse(`\`\`\`json
{"tags":["Adonis Gym","blood work"],"summary":"  Retention push.  "}
\`\`\``);
    expect(result.tags).toEqual(['adonis-gym', 'blood-work']);
    expect(result.summary).toBe('Retention push.');
  });

  it('returns empty on garbage', () => {
    expect(parseEnrichmentResponse('not json')).toEqual({ tags: [], summary: '' });
  });

  it('caps tags and summary length', () => {
    const result = parseEnrichmentResponse(
      JSON.stringify({
        tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        summary: 'x'.repeat(300),
      }),
    );
    expect(result.tags).toHaveLength(5);
    expect(result.summary.length).toBe(160);
  });
});
