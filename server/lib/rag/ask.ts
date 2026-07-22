import { invokeLLM } from '../invokeLLM';
import type { RetrievedChunk } from './retrieve';

export type AskCitation = {
  path: string;
  title: string;
  score: number;
  excerpt: string;
};

export type AskResult = {
  answer: string;
  citations: AskCitation[];
  sourcePaths: string[];
};

function titleFromPath(notePath: string): string {
  const base = notePath.split('/').pop() ?? notePath;
  return base.replace(/\.md$/i, '').replace(/-/g, ' ');
}

export function buildCitations(chunks: RetrievedChunk[]): AskCitation[] {
  const byPath = new Map<string, AskCitation>();

  for (const chunk of chunks) {
    const existing = byPath.get(chunk.path);
    if (!existing || chunk.score > existing.score) {
      byPath.set(chunk.path, {
        path: chunk.path,
        title: titleFromPath(chunk.path),
        score: chunk.score,
        excerpt: chunk.text.slice(0, 180),
      });
    }
  }

  return [...byPath.values()].sort((a, b) => b.score - a.score);
}

export async function answerWithContext(
  question: string,
  chunks: RetrievedChunk[],
): Promise<AskResult> {
  const citations = buildCitations(chunks);

  if (chunks.length === 0) {
    return {
      answer:
        'No matching vault notes found. Try reindexing with VOYAGE_API_KEY set, or ask about something in your notes.',
      citations: [],
      sourcePaths: [],
    };
  }

  const context = chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] path=${chunk.path}\n${chunk.text}`,
    )
    .join('\n\n');

  const answer = await invokeLLM(
    [
      {
        role: 'system',
        content:
          'You are the Saiyan Archive Scouter. Answer using ONLY the provided vault context. ' +
          'Be concise and practical. Cite note paths in parentheses when you use them, like (projects/mfp-campaign.md). ' +
          'If the context is insufficient, say what is missing.',
      },
      {
        role: 'user',
        content: `Vault context:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    { maxTokens: 1024 },
  );

  return {
    answer,
    citations,
    sourcePaths: citations.map((c) => c.path),
  };
}
