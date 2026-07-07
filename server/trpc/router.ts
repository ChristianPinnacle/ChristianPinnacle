import { initTRPC } from '@trpc/server';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const VAULT_DIR = path.resolve(process.cwd(), 'vault');

async function countVaultNotes(dir: string): Promise<number> {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countVaultNotes(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      count += 1;
    }
  }

  return count;
}

export const appRouter = t.router({
  health: t.procedure.query(async () => {
    const noteCount = await countVaultNotes(VAULT_DIR);
    const dbConfigured = Boolean(process.env.DATABASE_URL);

    return {
      status: 'ok' as const,
      vaultNoteCount: noteCount,
      dbConfigured,
    };
  }),

  vault: t.router({
    list: t.procedure.query(async () => {
      const notes: Array<{ path: string; title: string; folder: string }> = [];
      const folders = ['projects', 'areas', 'resources', 'warroom', 'unsorted', 'archive'] as const;

      for (const folder of folders) {
        const folderPath = path.join(VAULT_DIR, folder);
        try {
          const files = await readdir(folderPath);
          for (const file of files) {
            if (!file.endsWith('.md')) continue;
            const content = await readFile(path.join(folderPath, file), 'utf-8');
            const titleMatch = content.match(/^title:\s*(.+)$/m);
            notes.push({
              path: `${folder}/${file}`,
              title: titleMatch?.[1]?.trim() ?? file.replace(/\.md$/, ''),
              folder,
            });
          }
        } catch {
          // folder may not exist yet
        }
      }

      return notes;
    }),
  }),

  echo: t.procedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => ({ echoed: input.message })),
});

export type AppRouter = typeof appRouter;
