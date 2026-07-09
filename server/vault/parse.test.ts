import { describe, expect, it } from "vitest";
import { extractWikilinks, countWords, parseNoteFile } from "./parse.js";

const SAMPLE = `---
title: VitalEdge Hub
folder: projects
tags: [saas, health]
created: 2026-07-08
updated: 2026-07-08
source: user
summary: Core SaaS platform.
---

# VitalEdge Hub

Connects [[Pinnacle Coaching]] with [[MFP Campaign]] acquisition.
Also see [[Pinnacle Coaching]] again.
`;

describe("parseNoteFile", () => {
  it("parses valid frontmatter and body", () => {
    const note = parseNoteFile("projects/vitaledge-hub.md", SAMPLE);

    expect(note.path).toBe("projects/vitaledge-hub.md");
    expect(note.frontmatter.title).toBe("VitalEdge Hub");
    expect(note.frontmatter.folder).toBe("projects");
    expect(note.frontmatter.tags).toEqual(["saas", "health"]);
    expect(note.frontmatter.source).toBe("user");
    expect(note.body).toContain("# VitalEdge Hub");
    expect(note.wordCount).toBeGreaterThan(5);
  });

  it("rejects missing frontmatter fields", () => {
    const bad = `---
title: Broken
folder: projects
---
Body only`;
    expect(() => parseNoteFile("broken.md", bad)).toThrow();
  });
});

describe("extractWikilinks", () => {
  it("extracts unique wikilink targets", () => {
    const links = extractWikilinks(
      "See [[Pinnacle Coaching]] and [[MFP Campaign|campaign]] and [[Note#heading]].",
    );
    expect(links).toEqual(["Pinnacle Coaching", "MFP Campaign", "Note"]);
  });

  it("returns empty array when no links", () => {
    expect(extractWikilinks("Plain text only.")).toEqual([]);
  });
});

describe("countWords", () => {
  it("counts words in markdown body", () => {
    expect(countWords("Hello **world** and `code`")).toBe(3);
  });

  it("returns zero for empty content", () => {
    expect(countWords("   ")).toBe(0);
  });
});
