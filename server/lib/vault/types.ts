import { z } from 'zod';

export const VALID_FOLDERS = [
  'projects',
  'areas',
  'resources',
  'warroom',
  'archive',
  'unsorted',
] as const;

export const VALID_SOURCES = [
  'user',
  'manus',
  'claude-code',
  'candice',
  'import',
] as const;

export const vaultFrontmatterSchema = z.object({
  title: z.string().min(1),
  folder: z.enum(VALID_FOLDERS),
  tags: z.array(z.string()).default([]),
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(VALID_SOURCES),
  summary: z.string().default(''),
});

export type VaultFrontmatter = z.infer<typeof vaultFrontmatterSchema>;

export interface ParsedNote {
  path: string;
  frontmatter: VaultFrontmatter;
  body: string;
  wikilinks: string[];
  wordCount: number;
}

export interface IndexNote {
  path: string;
  title: string;
  folder: string;
  updated: string;
  wordCount: number;
  plScore: number;
}

export interface IndexLink {
  sourcePath: string;
  targetPath: string;
  type: 'wiki';
}

export interface VaultIndex {
  notes: IndexNote[];
  links: IndexLink[];
  unresolvedLinks: Array<{ sourcePath: string; target: string }>;
}
