import 'dotenv/config';
import { describe, expect, it } from 'vitest';
import { appRouter } from './router';
import { testContext } from './testContext';

describe('health Phase 2 fields', () => {
  it('reports db and AI configuration flags', async () => {
    const caller = appRouter.createCaller(testContext());
    const result = await caller.health();

    expect(result.status).toBe('ok');
    expect(typeof result.dbConfigured).toBe('boolean');
    expect(typeof result.voyageConfigured).toBe('boolean');
    expect(typeof result.anthropicConfigured).toBe('boolean');
    expect('embeddingCount' in result).toBe(true);
  });
});

describe('chat.ask', () => {
  it('rejects when AI keys are missing', async () => {
    const caller = appRouter.createCaller(testContext());
    const health = await caller.health();

    if (health.voyageConfigured && health.anthropicConfigured && health.dbConfigured) {
      // Keys present — skip negative assertion
      expect(true).toBe(true);
      return;
    }

    await expect(
      caller.chat.ask({ question: 'What is in the vault?' }),
    ).rejects.toThrow();
  });

  it(
    'accepts pathFilter and keeps citations on that note',
    async () => {
      const caller = appRouter.createCaller(testContext());
      const health = await caller.health();

      if (!health.dbConfigured || !health.voyageConfigured || !health.anthropicConfigured) {
        expect(true).toBe(true);
        return;
      }

      if ((health.embeddingCount ?? 0) < 1) {
        expect(true).toBe(true);
        return;
      }

      const scopedPath = 'projects/vitaledge-hub.md';
      const result = await caller.chat.ask({
        question: 'Summarize this note briefly.',
        pathFilter: scopedPath,
      });

      expect(result.answer.length).toBeGreaterThan(0);
      expect(result.citations.every((c) => c.path === scopedPath)).toBe(true);
    },
    60_000,
  );
});

describe('chat.create', () => {
  it('rejects when AI keys are missing', async () => {
    const caller = appRouter.createCaller(testContext());
    const health = await caller.health();

    if (health.voyageConfigured && health.anthropicConfigured && health.dbConfigured) {
      expect(true).toBe(true);
      return;
    }

    await expect(
      caller.chat.create({ brief: 'Write a short Pinnacle ad hook.' }),
    ).rejects.toThrow();
  });

  it(
    'returns a grounded draft when configured',
    async () => {
      const caller = appRouter.createCaller(testContext());
      const health = await caller.health();

      if (!health.dbConfigured || !health.voyageConfigured || !health.anthropicConfigured) {
        expect(true).toBe(true);
        return;
      }
      if ((health.embeddingCount ?? 0) < 1) {
        expect(true).toBe(true);
        return;
      }

      const result = await caller.chat.create({
        brief: 'Write a one-paragraph coach-to-coach intro for VitalEdge Hub.',
      });

      expect(result.draft.length).toBeGreaterThan(20);
      expect(result.titleSuggestion.length).toBeGreaterThan(0);
      expect(Array.isArray(result.citations)).toBe(true);
    },
    90_000,
  );
});

describe('chat.decide', () => {
  it('rejects when AI keys are missing', async () => {
    const caller = appRouter.createCaller(testContext());
    const health = await caller.health();

    if (health.voyageConfigured && health.anthropicConfigured && health.dbConfigured) {
      expect(true).toBe(true);
      return;
    }

    await expect(
      caller.chat.decide({ question: 'Did we choose B2B first?' }),
    ).rejects.toThrow();
  });

  it(
    'answers from warroom notes only',
    async () => {
      const caller = appRouter.createCaller(testContext());
      const health = await caller.health();

      if (!health.dbConfigured || !health.voyageConfigured || !health.anthropicConfigured) {
        expect(true).toBe(true);
        return;
      }
      if ((health.embeddingCount ?? 0) < 1) {
        expect(true).toBe(true);
        return;
      }

      const result = await caller.chat.decide({
        question: 'Did we decide B2B-first for VitalEdge?',
      });

      expect(result.answer.length).toBeGreaterThan(10);
      expect(result.sourcePaths.every((p) => p.startsWith('warroom/'))).toBe(true);
      expect(result.citations.every((c) => c.path.startsWith('warroom/'))).toBe(true);
    },
    90_000,
  );
});

