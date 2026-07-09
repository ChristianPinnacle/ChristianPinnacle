import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createContext } from "../context.js";
import { appRouter } from "./index.js";

describe("health.get", () => {
  it("returns vault note count and paths", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "saiyan-vault-"));
    await mkdir(path.join(tmp, "projects"));
    await writeFile(
      path.join(tmp, "projects", "test-note.md"),
      `---
title: Test
folder: projects
tags: []
created: 2026-07-08
updated: 2026-07-08
source: user
summary: test
---
Body`,
      "utf8",
    );

    const caller = appRouter.createCaller(createContext(null, tmp));
    const result = await caller.health.get();

    expect(result.status).toBe("ok");
    expect(result.noteCount).toBe(1);
    expect(result.notes).toEqual(["projects/test-note.md"]);
    expect(result.parsedNoteCount).toBe(1);
    expect(result.dbConnected).toBe(false);
    expect(result.indexedNoteCount).toBeNull();
    expect(result.vaultReadable).toBe(true);
  });

  it("returns zero notes for missing vault", async () => {
    const caller = appRouter.createCaller(
      createContext(null, path.join(os.tmpdir(), "nonexistent-vault-xyz")),
    );
    const result = await caller.health.get();

    expect(result.noteCount).toBe(0);
    expect(result.notes).toEqual([]);
    expect(result.parsedNoteCount).toBe(0);
  });
});
