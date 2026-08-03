import { describe, expect, it } from 'vitest';
import { parseResearchProposals } from './research';

describe('parseResearchProposals', () => {
  it('parses a fenced JSON array and caps proposals', () => {
    const raw = `Here you go:
\`\`\`json
[
  {
    "title": "Competitor Pricing",
    "folder": "resources",
    "summary": "Pricing scan",
    "body": "Findings...",
    "sources": ["https://example.com"]
  },
  {
    "title": "Bad Folder",
    "folder": "nowhere",
    "summary": "x",
    "body": "y",
    "sources": []
  }
]
\`\`\``;

    const proposals = parseResearchProposals(raw);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.title).toBe('Competitor Pricing');
    expect(proposals[0]?.folder).toBe('resources');
    expect(proposals[0]?.sources).toEqual(['https://example.com']);
  });
});
