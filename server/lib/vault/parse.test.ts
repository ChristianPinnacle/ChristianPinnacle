import { describe, expect, it } from 'vitest';
import { extractWikilinks, parseVaultFile } from './parse';

const SAMPLE_NOTE = `---
title: MFP Campaign
folder: projects
tags: [marketing, vitaledge]
created: 2026-07-08
updated: 2026-07-08
source: user
summary: Meta fitness professional campaign for VitalEdge Hub lead generation.
---
# MFP Campaign

Key frameworks referenced in [[Marketing Playbook]].

Decision context from [[Q3 Growth Decision|Q3 decision]].
`;

describe('parseVaultFile', () => {
  it('parses valid frontmatter and body', () => {
    const parsed = parseVaultFile('projects/mfp-campaign.md', SAMPLE_NOTE);

    expect(parsed.path).toBe('projects/mfp-campaign.md');
    expect(parsed.frontmatter.title).toBe('MFP Campaign');
    expect(parsed.frontmatter.folder).toBe('projects');
    expect(parsed.frontmatter.tags).toEqual(['marketing', 'vitaledge']);
    expect(parsed.frontmatter.source).toBe('user');
    expect(parsed.body).toContain('# MFP Campaign');
    expect(parsed.wordCount).toBeGreaterThan(0);
  });

  it('rejects notes without valid frontmatter', () => {
    expect(() => parseVaultFile('bad.md', '# No frontmatter')).toThrow();
  });
});

describe('extractWikilinks', () => {
  it('extracts plain and aliased wikilinks', () => {
    const links = extractWikilinks(SAMPLE_NOTE);

    expect(links).toEqual(['Marketing Playbook', 'Q3 Growth Decision']);
  });

  it('deduplicates repeated links', () => {
    const links = extractWikilinks('See [[Note A]] and again [[Note A]].');
    expect(links).toEqual(['Note A']);
  });
});
