/**
 * Voyage AI embeddings client (Anthropic-recommended for RAG).
 * Uses REST API — no SDK dependency.
 * Graceful: returns null config status when VOYAGE_API_KEY is unset.
 */

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const DEFAULT_MODEL = 'voyage-4';

export type EmbedInputType = 'document' | 'query';

export function isVoyageConfigured(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY?.trim());
}

export async function embedTexts(
  texts: string[],
  inputType: EmbedInputType,
  options?: { model?: string },
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not set — cannot embed.');
  }

  const model = options?.model ?? DEFAULT_MODEL;

  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model,
        input_type: inputType,
      }),
    });

    if (response.status === 429 && attempt < maxAttempts) {
      const waitMs = attempt * 20_000;
      console.log(`[voyage] rate limited — waiting ${waitMs / 1000}s (attempt ${attempt}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Voyage embeddings failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding: number[]; index: number }>;
    };

    if (!payload.data || payload.data.length !== texts.length) {
      throw new Error('Voyage embeddings response missing data');
    }

    return [...payload.data]
      .sort((a, b) => a.index - b.index)
      .map((row) => row.embedding);
  }

  throw new Error('Voyage embeddings failed after retries');
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
