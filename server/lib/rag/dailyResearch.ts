/**
 * Daily training-science research cron — auto-files vault notes (approve not required).
 * Vault is source of truth; MySQL picks notes up via reindex / afterNoteWrite.
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { invokeLLM } from '../invokeLLM';
import { serializeNote } from '../vault/notes';
import type { VaultFrontmatter } from '../vault/types';
import { isTavilyConfigured, searchTavily } from './research';

export const DEFAULT_DAILY_TOPICS = [
  'hypertrophy',
  'strength',
  'injury rehab',
  'endurance training',
  'weight lifting',
] as const;

export type DailyTopic = string;

export type DailyTopicNote = {
  topic: string;
  title: string;
  notePath: string;
  summary: string;
  sources: string[];
};

export type DailyResearchResult = {
  date: string;
  skipped: boolean;
  summaryPath: string;
  notes: DailyTopicNote[];
  errors: Array<{ topic: string; message: string }>;
};

export type RunDailyResearchOptions = {
  topics?: readonly string[];
  force?: boolean;
  now?: Date;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function topicSlug(topic: string): string {
  return (
    topic
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'topic'
  );
}

export function dailyTopicNotePath(topic: string, date: string): string {
  return `resources/daily-${topicSlug(topic)}-${date}.md`;
}

export function dailySummaryNotePath(date: string): string {
  return `warroom/daily-research-${date}.md`;
}

export function resolveDailyTopics(envValue?: string): string[] {
  const raw = (envValue ?? process.env.DAILY_RESEARCH_TOPICS ?? '').trim();
  if (!raw) return [...DEFAULT_DAILY_TOPICS];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function buildDailySearchQuery(topic: string, date: string): string {
  const year = date.slice(0, 4);
  return (
    `latest peer-reviewed studies ${topic} training ${year} ` +
    `OR ${Number(year) - 1} systematic review meta-analysis`
  );
}

type TopicDraft = {
  title: string;
  summary: string;
  body: string;
  sources: string[];
};

export function parseTopicDraft(raw: string): TopicDraft {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced?.[1] ?? raw).trim();
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  const title = String(parsed.title ?? '').trim();
  const summary = String(parsed.summary ?? '').trim();
  const body = String(parsed.body ?? '').trim();
  const sources = Array.isArray(parsed.sources)
    ? parsed.sources.map((s) => String(s)).filter(Boolean).slice(0, 8)
    : [];

  if (!title || !body) {
    throw new Error('Topic draft missing title or body');
  }

  return {
    title: title.slice(0, 120),
    summary: summary.slice(0, 240),
    body,
    sources,
  };
}

export function buildDailySummaryBody(
  date: string,
  notes: DailyTopicNote[],
  errors: Array<{ topic: string; message: string }>,
): string {
  const filed =
    notes.length === 0
      ? '_No topic notes filed today._'
      : notes
          .map(
            (n) =>
              `### [[${n.title}]]\n` +
              `- Topic: ${n.topic}\n` +
              `- ${n.summary || '_No summary._'}\n` +
              (n.sources.length > 0
                ? `- Sources: ${n.sources.map((u) => `<${u}>`).join(' · ')}\n`
                : ''),
          )
          .join('\n');

  const failed =
    errors.length === 0
      ? '_None._'
      : errors.map((e) => `- **${e.topic}**: ${e.message}`).join('\n');

  return `# Daily Research ${date}

Auto-filed training-science scan (hypertrophy · strength · injury rehab · endurance · lifting).

> Research for coaching/product context — not medical advice. Acute/severe issues still need a professional.

## Scouter summary
- Topics filed: ${notes.length}
- Failures: ${errors.length}

## Studies by topic
${filed}

## Failures
${failed}
`;
}

async function pathExists(fullPath: string): Promise<boolean> {
  try {
    await access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function draftTopicNote(topic: string, date: string): Promise<TopicDraft> {
  const query = buildDailySearchQuery(topic, date);
  const hits = await searchTavily(query);
  if (hits.length === 0) {
    throw new Error('No search results');
  }

  const evidence = hits
    .map((hit, i) => {
      const title = hit.title ?? `Result ${i + 1}`;
      const url = hit.url ?? '';
      const content = (hit.content ?? '').slice(0, 700);
      return `### ${title}\nURL: ${url}\n${content}`;
    })
    .join('\n\n');

  const raw = await invokeLLM(
    [
      {
        role: 'system',
        content:
          'You write one vault research note for Saiyan Archive (coaching second brain). ' +
          'Return ONLY JSON: {title, summary, body, sources}. ' +
          'Ground claims in the evidence. Never invent URLs. ' +
          'title under 80 chars. summary under 200 chars. body under 350 words. ' +
          'Include practical takeaways for strength coaches. ' +
          'For injury rehab: frame as program-generation guardrails, not diagnosis.',
      },
      {
        role: 'user',
        content:
          `Date: ${date}\nTopic: ${topic}\n\nWrite one note synthesizing the latest useful findings.\n\n` +
          `Web evidence:\n${evidence}`,
      },
    ],
    { maxTokens: 1600 },
  );

  return parseTopicDraft(raw);
}

async function writeFixedNote(
  vaultDir: string,
  relativePath: string,
  frontmatter: VaultFrontmatter,
  body: string,
): Promise<void> {
  const fullPath = path.join(vaultDir, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, serializeNote(frontmatter, body), 'utf-8');
}

/**
 * Run the daily research job. Overwrites same-day notes when force=true or
 * when the summary does not yet exist. If the summary already exists and
 * force is false, returns skipped=true without API calls.
 */
export async function runDailyResearch(
  vaultDir: string,
  options: RunDailyResearchOptions = {},
): Promise<DailyResearchResult> {
  if (!isTavilyConfigured()) {
    throw new Error('TAVILY_API_KEY is not set — add it to enable daily research');
  }

  const now = options.now ?? new Date();
  const date = isoDate(now);
  const topics = options.topics ?? resolveDailyTopics();
  const summaryPath = dailySummaryNotePath(date);
  const summaryFull = path.join(vaultDir, summaryPath);

  if (!options.force && (await pathExists(summaryFull))) {
    return {
      date,
      skipped: true,
      summaryPath,
      notes: [],
      errors: [],
    };
  }

  const notes: DailyTopicNote[] = [];
  const errors: Array<{ topic: string; message: string }> = [];

  for (const topic of topics) {
    try {
      const draft = await draftTopicNote(topic, date);
      const notePath = dailyTopicNotePath(topic, date);
      const sourcesBlock =
        draft.sources.length > 0
          ? `\n\n## Sources\n${draft.sources.map((url) => `- ${url}`).join('\n')}`
          : '';

      const frontmatter: VaultFrontmatter = {
        title: draft.title,
        folder: 'resources',
        tags: ['research', 'daily', 'import', topicSlug(topic)],
        created: date,
        updated: date,
        source: 'import',
        summary: draft.summary,
      };

      await writeFixedNote(
        vaultDir,
        notePath,
        frontmatter,
        `${draft.body.trim()}${sourcesBlock}`,
      );

      notes.push({
        topic,
        title: draft.title,
        notePath,
        summary: draft.summary,
        sources: draft.sources,
      });
    } catch (err) {
      errors.push({
        topic,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const summaryBody = buildDailySummaryBody(date, notes, errors);
  const summaryFm: VaultFrontmatter = {
    title: `Daily Research ${date}`,
    folder: 'warroom',
    tags: ['research', 'daily', 'digest'],
    created: date,
    updated: date,
    source: 'claude-code',
    summary: `Daily training-science scan: ${notes.length} topics filed, ${errors.length} failures.`,
  };

  await writeFixedNote(vaultDir, summaryPath, summaryFm, summaryBody);

  return {
    date,
    skipped: false,
    summaryPath,
    notes,
    errors,
  };
}
