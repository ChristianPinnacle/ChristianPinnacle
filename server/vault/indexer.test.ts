import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanVault } from "./scan.js";
import { buildVaultIndex } from "./indexer.js";
import { parseNoteFile } from "./parse.js";
import { computePlScore } from "./plScore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vaultPath = path.resolve(__dirname, "../../vault");
const fixedNow = new Date("2026-07-08T12:00:00Z");

describe("buildVaultIndex", () => {
  it("rebuilds index from the sample vault with resolved wiki links", async () => {
    const notes = await scanVault(vaultPath);
    const index = buildVaultIndex(notes, fixedNow);

    expect(index.notes).toHaveLength(11);
    expect(index.links.length).toBeGreaterThan(0);

    const titles = index.notes.map((n) => n.title).sort();
    expect(titles).toEqual([
      "Adonis Gym Voice Note",
      "B2B-First Decision",
      "Competitor Ad Scan",
      "MFP Campaign",
      "Marketing Playbook",
      "Pinnacle Coaching",
      "Pinnacle Soul File",
      "Q3 Growth Decision",
      "Quick Capture",
      "Vault Reindex Log",
      "VitalEdge Hub",
    ]);

    const vitaledge = index.notes.find((n) => n.title === "VitalEdge Hub");
    expect(vitaledge?.folder).toBe("projects");
    expect(vitaledge?.wordCount).toBeGreaterThan(0);
    expect(vitaledge?.plScore).toBeGreaterThan(500);

    const hasPinnacleLink = index.links.some(
      (l) =>
        l.sourcePath === "projects/vitaledge-hub.md" &&
        l.targetPath === "areas/pinnacle-coaching.md",
    );
    expect(hasPinnacleLink).toBe(true);
  });

  it("produces identical output on repeated rebuild (idempotent)", async () => {
    const notes = await scanVault(vaultPath);
    const first = buildVaultIndex(notes, fixedNow);
    const second = buildVaultIndex(notes, fixedNow);

    expect(second).toEqual(first);
  });

  it("deduplicates repeated wikilinks from the same note", () => {
    const note = parseNoteFile(
      "projects/test.md",
      `---
title: Test Note
folder: projects
tags: []
created: 2026-07-08
updated: 2026-07-08
source: user
summary: test
---
[[Target]] and [[Target]] again.`,
    );
    const target = parseNoteFile(
      "areas/target.md",
      `---
title: Target
folder: areas
tags: []
created: 2026-07-08
updated: 2026-07-08
source: user
summary: target
---
Body`,
    );

    const index = buildVaultIndex([note, target], fixedNow);
    expect(index.links).toHaveLength(1);
    expect(index.links[0]?.targetPath).toBe("areas/target.md");
  });

  it("skips unresolved wikilinks", () => {
    const note = parseNoteFile(
      "projects/orphan.md",
      `---
title: Orphan
folder: projects
tags: []
created: 2026-07-08
updated: 2026-07-08
source: user
summary: orphan
---
Links to [[Missing Note]].`,
    );

    const index = buildVaultIndex([note], fixedNow);
    expect(index.links).toHaveLength(0);
  });
});

describe("computePlScore", () => {
  it("increases score with inbound links and recency", () => {
    const base = computePlScore(0, 100, "2026-07-08", fixedNow);
    const linked = computePlScore(3, 100, "2026-07-08", fixedNow);
    const stale = computePlScore(3, 100, "2024-01-01", fixedNow);

    expect(linked).toBeGreaterThan(base);
    expect(linked).toBeGreaterThan(stale);
  });
});
