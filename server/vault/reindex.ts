import { eq } from "drizzle-orm";
import type { Database } from "../db/index.js";
import { links, notesIndex } from "../db/schema.js";
import { buildVaultIndex } from "./indexer.js";
import { buildTitleIndex, resolveWikilink } from "./resolve.js";
import { scanVault } from "./scan.js";

export type ReindexResult = {
  noteCount: number;
  linkCount: number;
  unresolvedLinks: number;
};

export async function reindexVault(db: Database, vaultPath: string): Promise<ReindexResult> {
  const parsedNotes = await scanVault(vaultPath);
  const titleIndex = buildTitleIndex(parsedNotes);
  const index = buildVaultIndex(parsedNotes);

  let unresolvedLinks = 0;
  for (const note of parsedNotes) {
    const sourcePath = note.path.replace(/\\/g, "/");
    for (const target of note.wikilinks) {
      const resolved = resolveWikilink(target, titleIndex);
      if (!resolved || resolved === sourcePath) {
        unresolvedLinks += 1;
      }
    }
  }

  await db.delete(links).where(eq(links.type, "wiki"));
  await db.delete(notesIndex);

  if (index.notes.length > 0) {
    await db.insert(notesIndex).values(index.notes);
  }

  if (index.links.length > 0) {
    await db.insert(links).values(index.links);
  }

  return {
    noteCount: index.notes.length,
    linkCount: index.links.length,
    unresolvedLinks,
  };
}
