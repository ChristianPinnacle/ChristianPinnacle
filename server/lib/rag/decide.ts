/**
 * DECIDE mode — answer from War Room decision log only.
 */
import type { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../db/schema';
import { invokeLLM } from '../invokeLLM';
import { buildCitations, type AskCitation } from './ask';
import { retrieveChunks, type RetrievedChunk } from './retrieve';

type Db = MySql2Database<typeof schema>;

export const WARROOM_FOLDER = 'warroom';

export type DecideResult = {
  answer: string;
  citations: AskCitation[];
  sourcePaths: string[];
};

export async function decideWithContext(
  question: string,
  chunks: RetrievedChunk[],
): Promise<DecideResult> {
  const citations = buildCitations(chunks);

  if (chunks.length === 0) {
    return {
      answer:
        'No War Room decisions matched. Add notes under vault/warroom/ and reindex, or rephrase the question.',
      citations: [],
      sourcePaths: [],
    };
  }

  const context = chunks
    .map((chunk, i) => `[${i + 1}] path=${chunk.path}\n${chunk.text}`)
    .join('\n\n');

  const answer = await invokeLLM(
    [
      {
        role: 'system',
        content:
          'You are the Saiyan Archive DECIDE scouter. Answer using ONLY the War Room decision log context. ' +
          'State the decision, status/date if present, rationale, and any revisit triggers. ' +
          'Be concise. Cite note paths in parentheses like (warroom/b2b-first-decision.md). ' +
          'If the log does not cover the question, say what decision is missing — do not invent policy.',
      },
      {
        role: 'user',
        content: `War Room context:\n\n${context}\n\nQuestion: ${question}`,
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

export async function runDecide(db: Db, question: string): Promise<DecideResult> {
  const chunks = await retrieveChunks(db, question, {
    topK: 6,
    folderPrefix: WARROOM_FOLDER,
  });
  return decideWithContext(question, chunks);
}
