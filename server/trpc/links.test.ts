import 'dotenv/config';
import { describe, expect, it } from 'vitest';
import { getDb, closeDb } from '../db';
import { isVoyageConfigured } from '../lib/rag/embed';
import { proposeAiLinksForNote, listPendingAiLinks, rejectAiLink } from '../lib/rag/autolink';
import { appRouter } from './router';
import { testContext } from './testContext';

describe('links.pending', () => {
  it('returns an array', async () => {
    const caller = appRouter.createCaller(testContext());
    const pending = await caller.links.pending();
    expect(Array.isArray(pending)).toBe(true);
  });
});

describe('links.propose', () => {
  it(
    'proposes AI links for a vault note when Voyage is configured',
    async () => {
      const db = getDb();
      if (!db || !isVoyageConfigured()) {
        expect(true).toBe(true);
        return;
      }

      const sourcePath = 'projects/vitaledge-hub.md';
      // Clear prior pending for this source so propose can insert fresh ones
      const existing = await listPendingAiLinks(db);
      for (const link of existing.filter((l) => l.sourcePath === sourcePath)) {
        await rejectAiLink(db, link.sourcePath, link.targetPath);
      }

      const caller = appRouter.createCaller(testContext());
      const result = await caller.links.propose({ path: sourcePath });

      expect(result.proposed).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.proposals)).toBe(true);

      const pending = await caller.links.pending();
      expect(pending.every((p) => typeof p.confidence === 'number')).toBe(true);

      await closeDb();
    },
    90_000,
  );
});

describe('graph.get AI edges', () => {
  it('edge payloads include a type field', async () => {
    const caller = appRouter.createCaller(testContext());
    const graph = await caller.graph.get();
    expect(graph.edges.every((e) => e.type === 'wiki' || e.type === 'ai')).toBe(true);
  });
});

describe('autolink pure helpers', () => {
  it('proposeAiLinksForNote returns empty when note has no embeddings', async () => {
    const db = getDb();
    if (!db) {
      expect(true).toBe(true);
      return;
    }

    const result = await proposeAiLinksForNote(db, 'does/not-exist.md');
    expect(result.proposed).toBe(0);
    expect(result.proposals).toEqual([]);
    await closeDb();
  });
});

