import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { count, eq } from "drizzle-orm";
import { publicProcedure, router } from "../trpc.js";
import { notesIndex, links } from "../db/schema.js";
import { scanVault } from "../vault/scan.js";

async function listVaultNotePaths(vaultPath: string): Promise<string[]> {
  const notes: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        notes.push(path.relative(vaultPath, fullPath).replace(/\\/g, "/"));
      }
    }
  }

  try {
    await walk(vaultPath);
  } catch {
    return [];
  }

  return notes.sort();
}

export const healthRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const vaultNotes = await listVaultNotePaths(ctx.vaultPath);
    const noteCount = vaultNotes.length;

    let vaultReadable = true;
    try {
      if (noteCount > 0) {
        await readFile(path.join(ctx.vaultPath, vaultNotes[0] ?? ""), "utf8");
      }
    } catch {
      vaultReadable = false;
    }

    let indexedNoteCount: number | null = null;
    let indexedLinkCount: number | null = null;

    if (ctx.db) {
      const [noteRows] = await ctx.db.select({ value: count() }).from(notesIndex);
      const [linkRows] = await ctx.db
        .select({ value: count() })
        .from(links)
        .where(eq(links.type, "wiki"));
      indexedNoteCount = noteRows?.value ?? 0;
      indexedLinkCount = linkRows?.value ?? 0;
    }

    let parsedNoteCount = 0;
    try {
      const parsed = await scanVault(ctx.vaultPath);
      parsedNoteCount = parsed.length;
    } catch {
      parsedNoteCount = 0;
    }

    return {
      status: "ok" as const,
      noteCount,
      notes: vaultNotes,
      parsedNoteCount,
      indexedNoteCount,
      indexedLinkCount,
      dbConnected: ctx.db !== null,
      vaultPath: ctx.vaultPath,
      vaultReadable,
    };
  }),
});
