import { computePlScore } from "./plScore.js";
import { buildTitleIndex, resolveWikilink } from "./resolve.js";
import type { ParsedNote, VaultIndex, WikiLinkRow } from "./types.js";

export function buildVaultIndex(notes: ParsedNote[], now: Date = new Date()): VaultIndex {
  const titleIndex = buildTitleIndex(notes);
  const inboundCounts = new Map<string, number>();

  const links: WikiLinkRow[] = [];
  const seenLinks = new Set<string>();

  for (const note of notes) {
    const sourcePath = note.path.replace(/\\/g, "/");

    for (const target of note.wikilinks) {
      const targetPath = resolveWikilink(target, titleIndex);
      if (!targetPath || targetPath === sourcePath) {
        continue;
      }

      const key = `${sourcePath}->${targetPath}`;
      if (seenLinks.has(key)) {
        continue;
      }
      seenLinks.add(key);

      links.push({
        sourcePath,
        targetPath,
        type: "wiki",
        confidence: 1,
        accepted: true,
      });

      inboundCounts.set(targetPath, (inboundCounts.get(targetPath) ?? 0) + 1);
    }
  }

  const indexNotes = notes.map((note) => {
    const notePath = note.path.replace(/\\/g, "/");
    const inbound = inboundCounts.get(notePath) ?? 0;

    return {
      path: notePath,
      title: note.frontmatter.title,
      folder: note.frontmatter.folder,
      updated: note.frontmatter.updated,
      wordCount: note.wordCount,
      plScore: computePlScore(inbound, note.wordCount, note.frontmatter.updated, now),
    };
  });

  return { notes: indexNotes, links };
}
