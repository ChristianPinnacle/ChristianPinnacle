import { describe, expect, it } from 'vitest';
import {
  buildDailySearchQuery,
  buildDailySummaryBody,
  dailySummaryNotePath,
  dailyTopicNotePath,
  DEFAULT_DAILY_TOPICS,
  parseTopicDraft,
  resolveDailyTopics,
  topicSlug,
} from './dailyResearch';

describe('dailyResearch helpers', () => {
  it('uses the five default training topics', () => {
    expect(DEFAULT_DAILY_TOPICS).toEqual([
      'hypertrophy',
      'strength',
      'injury rehab',
      'endurance training',
      'weight lifting',
    ]);
  });

  it('slugs topics and builds stable same-day paths', () => {
    expect(topicSlug('injury rehab')).toBe('injury-rehab');
    expect(dailyTopicNotePath('hypertrophy', '2026-08-03')).toBe(
      'resources/daily-hypertrophy-2026-08-03.md',
    );
    expect(dailySummaryNotePath('2026-08-03')).toBe(
      'warroom/daily-research-2026-08-03.md',
    );
  });

  it('resolves topics from a comma list', () => {
    expect(resolveDailyTopics('a, b ,c')).toEqual(['a', 'b', 'c']);
  });

  it('builds a year-aware search query', () => {
    expect(buildDailySearchQuery('strength', '2026-08-03')).toContain('strength');
    expect(buildDailySearchQuery('strength', '2026-08-03')).toContain('2026');
  });

  it('parses a topic draft from fenced JSON', () => {
    const draft = parseTopicDraft(`\`\`\`json
{"title":"Hypertrophy Update","summary":"Volume still wins","body":"Details…","sources":["https://example.com"]}
\`\`\``);
    expect(draft.title).toBe('Hypertrophy Update');
    expect(draft.sources).toEqual(['https://example.com']);
  });

  it('builds a War Room summary with wikilinks', () => {
    const body = buildDailySummaryBody(
      '2026-08-03',
      [
        {
          topic: 'hypertrophy',
          title: 'Hypertrophy Update',
          notePath: 'resources/daily-hypertrophy-2026-08-03.md',
          summary: 'Volume still wins',
          sources: ['https://example.com'],
        },
      ],
      [{ topic: 'strength', message: 'No search results' }],
    );

    expect(body).toContain('[[Hypertrophy Update]]');
    expect(body).toContain('**strength**');
    expect(body).toContain('Topics filed: 1');
  });
});
