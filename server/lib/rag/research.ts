/**
 * Autonomous research agent (approve-before-write).
 * Uses Tavily when TAVILY_API_KEY is set; otherwise fails clearly.
 * Never writes to the vault until the caller accepts a proposal.
 */
import { invokeLLM } from '../invokeLLM';
import { createNote, type NoteFolder, type NoteRecord } from '../vault/notes';
import { VALID_FOLDERS } from '../vault/types';

export type ResearchProposal = {
  id: string;
  title: string;
  folder: NoteFolder;
  summary: string;
  body: string;
  sources: string[];
};

type TavilyHit = {
  title?: string;
  url?: string;
  content?: string;
};

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

export async function searchTavily(query: string): Promise<TavilyHit[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set — add it to enable research search');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed (${response.status})`);
  }

  const data = (await response.json()) as { results?: TavilyHit[] };
  return Array.isArray(data.results) ? data.results : [];
}

export function parseResearchProposals(raw: string): ResearchProposal[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced?.[1] ?? raw).trim();
  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Research response was not a JSON array');
  }

  const folderSet = new Set<string>(VALID_FOLDERS);
  const proposals: ResearchProposal[] = [];

  for (const [index, item] of parsed.entries()) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const title = String(row.title ?? '').trim();
    const folder = String(row.folder ?? 'resources').trim();
    const summary = String(row.summary ?? '').trim();
    const body = String(row.body ?? '').trim();
    const sources = Array.isArray(row.sources)
      ? row.sources.map((s) => String(s)).filter(Boolean)
      : [];

    if (!title || !body) continue;
    if (!folderSet.has(folder)) continue;

    proposals.push({
      id: `research-${Date.now()}-${index}`,
      title: title.slice(0, 120),
      folder: folder as NoteFolder,
      summary: summary.slice(0, 240),
      body,
      sources: sources.slice(0, 8),
    });
  }

  return proposals.slice(0, 5);
}

export async function proposeResearch(
  brief: string,
  contextPack: string,
): Promise<ResearchProposal[]> {
  const query = brief.trim();
  if (!query) {
    throw new Error('Research brief is required');
  }

  const hits = await searchTavily(query);
  if (hits.length === 0) {
    throw new Error('No search results — try a more specific brief');
  }

  const evidence = hits
    .map((hit, i) => {
      const title = hit.title ?? `Result ${i + 1}`;
      const url = hit.url ?? '';
      const content = (hit.content ?? '').slice(0, 800);
      return `### ${title}\nURL: ${url}\n${content}`;
    })
    .join('\n\n');

  const raw = await invokeLLM(
    [
      {
        role: 'system',
        content:
          'You propose vault notes for Saiyan Archive. Return ONLY a JSON array of ' +
          'objects with keys: title, folder, summary, body, sources (URL strings). ' +
          'folder must be one of projects|areas|resources|warroom|archive|unsorted. ' +
          'Prefer resources. Ground claims in the evidence. Max 3 proposals. ' +
          'Never invent URLs. Keep each body under 400 words.',
      },
      {
        role: 'user',
        content:
          `Research brief:\n${query}\n\nVault context:\n${contextPack.slice(0, 3000)}\n\n` +
          `Web evidence:\n${evidence}`,
      },
    ],
    { maxTokens: 2500 },
  );

  return parseResearchProposals(raw);
}

export async function acceptResearchProposal(
  vaultDir: string,
  proposal: Omit<ResearchProposal, 'id'>,
): Promise<NoteRecord> {
  const sourcesBlock =
    proposal.sources.length > 0
      ? `\n\n## Sources\n${proposal.sources.map((url) => `- ${url}`).join('\n')}`
      : '';

  return createNote(vaultDir, {
    title: proposal.title,
    folder: proposal.folder,
    body: `${proposal.body.trim()}${sourcesBlock}`,
    tags: ['research', 'import'],
    summary: proposal.summary,
    source: 'import',
  });
}
