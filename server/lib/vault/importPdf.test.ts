import { describe, expect, it } from 'vitest';
import { titleFromPdfFilename } from './importPdf';
import { suggestInboxTitle } from './inbox';

describe('titleFromPdfFilename', () => {
  it('strips extension and cleans separators', () => {
    expect(titleFromPdfFilename('Market_Intelligence-Report.PDF')).toBe(
      'Market Intelligence Report',
    );
  });
});

describe('suggestInboxTitle', () => {
  it('uses the first non-empty line', () => {
    expect(suggestInboxTitle('\n  Launch MFP ads tomorrow\nMore detail')).toBe(
      'Launch MFP ads tomorrow',
    );
  });

  it('falls back when empty', () => {
    expect(suggestInboxTitle('   ')).toBe('Quick capture');
  });
});
