import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseNoteFile } from "./parse.js";
import type { ParsedNote } from "./types.js";

async function walkMarkdownFiles(rootDir: string, currentDir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(rootDir, fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path.relative(rootDir, fullPath));
    }
  }

  return files;
}

export async function scanVault(vaultPath: string): Promise<ParsedNote[]> {
  let relativePaths: string[] = [];

  try {
    relativePaths = await walkMarkdownFiles(vaultPath, vaultPath);
  } catch {
    return [];
  }

  const notes: ParsedNote[] = [];

  for (const relativePath of relativePaths.sort()) {
    const fullPath = path.join(vaultPath, relativePath);
    const raw = await readFile(fullPath, "utf8");
    notes.push(parseNoteFile(relativePath, raw));
  }

  return notes;
}
