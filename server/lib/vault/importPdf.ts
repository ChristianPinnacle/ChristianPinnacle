import { PDFParse } from 'pdf-parse';
import { createNote, type NoteRecord } from './notes';

const MIN_EXTRACTED_CHARS = 40;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

export function titleFromPdfFilename(filename: string): string {
  const base = filename.replace(/\\/g, '/').split('/').pop() ?? 'Imported PDF';
  return base.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Imported PDF';
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.replace(/\r/g, '').trim();
  } finally {
    await parser.destroy();
  }
}

export async function importPdfToVault(
  vaultDir: string,
  options: { filename: string; dataBase64: string },
): Promise<NoteRecord> {
  const buffer = Buffer.from(options.dataBase64, 'base64');
  if (buffer.length === 0) {
    throw new Error('PDF is empty');
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error('PDF too large (max 8 MB)');
  }

  // Quick magic-byte check so we fail clearly on non-PDFs.
  if (buffer.subarray(0, 4).toString('utf8') !== '%PDF') {
    throw new Error('File does not look like a PDF');
  }

  const text = await extractPdfText(buffer);
  if (text.length < MIN_EXTRACTED_CHARS) {
    throw new Error(
      'Could not extract enough text — this PDF may be scanned/image-only (OCR is a separate flow)',
    );
  }

  const title = titleFromPdfFilename(options.filename);
  const body = `# ${title}\n\n_Imported from PDF \`${options.filename}\`._\n\n${text}`;

  return createNote(vaultDir, {
    title,
    folder: 'unsorted',
    body,
    tags: ['import', 'pdf'],
    summary: `Imported PDF: ${options.filename}`,
    source: 'import',
  });
}
