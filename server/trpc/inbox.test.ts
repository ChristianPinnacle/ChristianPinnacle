import { describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

describe('inbox.capture', () => {
  it('files a quick capture into unsorted', async () => {
    const caller = appRouter.createCaller(testContext());
    const stamp = Date.now();
    const note = await caller.inbox.capture({
      text: `Inbox probe ${stamp}\nMore detail for the capture.`,
    });

    expect(note.folder).toBe('unsorted');
    expect(note.title).toContain('Inbox probe');
    await caller.notes.delete({ path: note.path });
  });
});

describe('research.status', () => {
  it('reports whether Tavily is configured and lists daily topics', async () => {
    const caller = appRouter.createCaller(testContext());
    const status = await caller.research.status();
    expect(typeof status.tavilyConfigured).toBe('boolean');
    expect(typeof status.anthropicConfigured).toBe('boolean');
    expect(status.dailyTopics).toEqual(
      expect.arrayContaining([
        'hypertrophy',
        'strength',
        'injury rehab',
        'endurance training',
        'weight lifting',
      ]),
    );
  });
});

describe('notes.importPdf', () => {
  it('rejects non-PDF payloads', async () => {
    const caller = appRouter.createCaller(testContext());
    await expect(
      caller.notes.importPdf({
        filename: 'not-a.pdf',
        dataBase64: Buffer.from('hello').toString('base64'),
      }),
    ).rejects.toThrow(/pdf/i);
  });
});
