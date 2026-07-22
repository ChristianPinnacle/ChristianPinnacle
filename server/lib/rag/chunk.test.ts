import { describe, expect, it } from 'vitest';
import { chunkText } from './chunk';

describe('chunkText', () => {
  it('returns empty array for blank body', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('returns a single chunk when body fits', () => {
    const chunks = chunkText('Short note about Adonis retention.');
    expect(chunks).toEqual([
      { chunkIdx: 0, text: 'Short note about Adonis retention.' },
    ]);
  });

  it('splits long text into overlapping chunks with sequential indexes', () => {
    const body = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. Some detail about the business.`).join(
      '\n\n',
    );
    const chunks = chunkText(body, { maxChars: 180, overlap: 40 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c, i) => c.chunkIdx === i)).toBe(true);
    expect(chunks.every((c) => c.text.length > 0 && c.text.length <= 180)).toBe(true);
  });

  it('prefers paragraph breaks over mid-word cuts', () => {
    const body = `${'A'.repeat(80)}\n\n${'B'.repeat(80)}\n\n${'C'.repeat(80)}`;
    const chunks = chunkText(body, { maxChars: 100, overlap: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((c) => c.text.includes('AAAA') && !c.text.includes('BBBB'))).toBe(true);
  });

  it('rejects invalid options', () => {
    expect(() => chunkText('hi', { maxChars: 0 })).toThrow();
    expect(() => chunkText('hi', { maxChars: 10, overlap: 10 })).toThrow();
  });
});
