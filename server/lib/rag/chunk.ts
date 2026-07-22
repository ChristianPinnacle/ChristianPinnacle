/**
 * Split note body into overlapping chunks for embedding.
 * Pure string logic — no I/O, no API keys.
 */
export type TextChunk = {
  chunkIdx: number;
  text: string;
};

const DEFAULT_MAX_CHARS = 1200;
const DEFAULT_OVERLAP = 200;

function findBreak(window: string, minRatio = 0.4): number {
  const minPos = Math.floor(window.length * minRatio);
  const candidates = [
    window.lastIndexOf('\n\n'),
    window.lastIndexOf('\n'),
    window.lastIndexOf('. '),
    window.lastIndexOf(' '),
  ];

  for (const pos of candidates) {
    if (pos >= minPos) {
      // Include the period when breaking on ". "
      if (window.slice(pos, pos + 2) === '. ') return pos + 1;
      return pos;
    }
  }
  return -1;
}

export function chunkText(
  body: string,
  options?: { maxChars?: number; overlap?: number },
): TextChunk[] {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;

  if (maxChars < 1) {
    throw new Error('maxChars must be >= 1');
  }
  if (overlap < 0 || overlap >= maxChars) {
    throw new Error('overlap must be >= 0 and < maxChars');
  }

  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxChars) {
    return [{ chunkIdx: 0, text: normalized }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let chunkIdx = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);

    if (end < normalized.length) {
      const window = normalized.slice(start, end);
      const breakAt = findBreak(window);
      if (breakAt >= 0) {
        end = start + breakAt;
      }
    }

    const text = normalized.slice(start, end).trim();
    if (text.length > 0) {
      chunks.push({ chunkIdx, text });
      chunkIdx += 1;
    }

    if (end >= normalized.length) break;

    const nextStart = Math.max(end - overlap, start + 1);
    start = nextStart;
  }

  return chunks;
}
