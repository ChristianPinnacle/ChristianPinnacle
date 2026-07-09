import { z } from "zod";

export const FOLDERS = [
  "projects",
  "areas",
  "resources",
  "warroom",
  "archive",
  "unsorted",
] as const;

export const SOURCES = ["user", "manus", "claude-code", "candice", "import"] as const;

export type Folder = (typeof FOLDERS)[number];
export type Source = (typeof SOURCES)[number];

export const frontmatterSchema = z.object({
  title: z.string().min(1),
  folder: z.enum(FOLDERS),
  tags: z.array(z.string()).default([]),
  created: z.string().min(1),
  updated: z.string().min(1),
  source: z.enum(SOURCES),
  summary: z.string().default(""),
});

export type VaultFrontmatter = z.infer<typeof frontmatterSchema>;

export type ParsedNote = {
  path: string;
  frontmatter: VaultFrontmatter;
  body: string;
  wikilinks: string[];
  wordCount: number;
};

export type NoteIndexRow = {
  path: string;
  title: string;
  folder: Folder;
  updated: string;
  wordCount: number;
  plScore: number;
};

export type WikiLinkRow = {
  sourcePath: string;
  targetPath: string;
  type: "wiki";
  confidence: number;
  accepted: boolean;
};

export type VaultIndex = {
  notes: NoteIndexRow[];
  links: WikiLinkRow[];
};
