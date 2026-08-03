import { createNote, type NoteRecord } from '../vault/notes';

export type InboxInput = {
  text: string;
  title?: string;
};

export function suggestInboxTitle(text: string): string {
  const firstLine = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return 'Quick capture';
  return firstLine.slice(0, 80);
}

export async function captureInboxNote(
  vaultDir: string,
  input: InboxInput,
): Promise<NoteRecord> {
  const text = input.text.trim();
  if (!text) {
    throw new Error('Inbox text is required');
  }

  const title = (input.title?.trim() || suggestInboxTitle(text)).slice(0, 120);

  return createNote(vaultDir, {
    title,
    folder: 'unsorted',
    body: text,
    tags: ['inbox'],
    summary: '',
    source: 'user',
  });
}
