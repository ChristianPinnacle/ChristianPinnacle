/**
 * Image OCR → unsorted note via Anthropic vision (no separate OCR vendor).
 */
import { invokeLLMVision } from '../invokeLLM';
import { createNote, type NoteRecord } from '../vault/notes';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type OcrMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export async function importImageOcrToVault(
  vaultDir: string,
  options: {
    filename: string;
    dataBase64: string;
    mimeType: OcrMime;
  },
): Promise<NoteRecord> {
  const buffer = Buffer.from(options.dataBase64, 'base64');
  if (buffer.length === 0) {
    throw new Error('Image is empty');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image too large (max 5 MB)');
  }

  const extracted = await invokeLLMVision(
    [
      {
        role: 'system',
        content:
          'Extract all readable text from the image. Preserve structure with markdown. ' +
          'If little or no text is visible, say so clearly. Do not invent content.',
      },
      {
        role: 'user',
        content: 'OCR this image into clean markdown.',
      },
    ],
    options.dataBase64,
    options.mimeType,
    { maxTokens: 2000 },
  );

  const titleBase = options.filename
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.(png|jpe?g|webp|gif)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const title = titleBase || `OCR capture ${new Date().toISOString().slice(0, 10)}`;
  const body =
    `# ${title}\n\n_OCR from \`${options.filename}\`._\n\n${extracted.trim()}`;

  return createNote(vaultDir, {
    title,
    folder: 'unsorted',
    body,
    tags: ['import', 'ocr'],
    summary: `OCR import: ${options.filename}`,
    source: 'import',
  });
}
