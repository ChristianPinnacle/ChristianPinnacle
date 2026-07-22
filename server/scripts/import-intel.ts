/**
 * Real vault import — Phase 5 Task 4.
 *
 * Copies Christian's curated Intelligence markdown files into the vault with
 * valid frontmatter and cross-links, so the graph + RAG run on real content.
 *
 * Source of truth stays the original files; this only *seeds* the vault. Re-run
 * safe — it overwrites the target notes each time.
 *
 *   npm run import:intel                 # uses default source dir
 *   INTEL_DIR="C:/path/to/Intelligence" npm run import:intel
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const vaultDir = process.env.VAULT_PATH ?? path.join(rootDir, "vault");
const intelDir = process.env.INTEL_DIR ?? "C:/Users/Chris/Desktop/Intelligence";

const TODAY = "2026-07-22";

interface ImportSpec {
  /** path relative to intelDir */
  src: string;
  /** target folder under vault/ */
  folder: "projects" | "areas" | "resources" | "warroom" | "archive" | "unsorted";
  /** target filename (without .md) under the folder */
  slug: string;
  /** frontmatter title — wikilinks resolve against this (case-insensitive) */
  title: string;
  tags: string[];
  summary: string;
  /** titles of related notes → become [[wikilinks]] in a Related section */
  related: string[];
}

const IMPORTS: ImportSpec[] = [
  {
    src: "brand/pinnacle-soul-file.md",
    folder: "resources",
    slug: "pinnacle-soul-file",
    title: "Pinnacle Soul File",
    tags: ["brand", "pinnacle", "voice"],
    summary:
      "Master voice, identity and operating reference for Pinnacle Coaching (v3.1) — the single source of truth for all content.",
    related: ["Marketing Playbook", "Market Intelligence", "Pinnacle Coaching", "Coach Methodologies"],
  },
  {
    src: "marketing/willington-playbook.md",
    folder: "resources",
    slug: "marketing-playbook",
    title: "Marketing Playbook",
    tags: ["marketing", "ads", "landing-pages"],
    summary:
      "Brandon Willington's complete Meta Ads + landing-page playbook — the working marketing reference.",
    related: ["Market Intelligence", "Pinnacle Soul File", "MFP Campaign"],
  },
  {
    src: "marketing/market-intelligence.md",
    folder: "resources",
    slug: "market-intelligence",
    title: "Market Intelligence",
    tags: ["marketing", "research", "competitors"],
    summary:
      "Competitor and marketing intelligence — Hormozi, Willington, Gymshark, algorithm and conversion data.",
    related: ["Marketing Playbook", "Competitor Pain Points", "Pinnacle Soul File"],
  },
  {
    src: "product-research/coach-methodologies-research.md",
    folder: "resources",
    slug: "coach-methodologies",
    title: "Coach Methodologies",
    tags: ["coaching", "methodology", "product"],
    summary:
      "Research master file on coach training philosophies feeding the AI program generator.",
    related: ["Coach Program Library", "Injury Adaptation Research", "VitalEdge Hub"],
  },
  {
    src: "product-research/coach-program-library.md",
    folder: "resources",
    slug: "coach-program-library",
    title: "Coach Program Library",
    tags: ["coaching", "programs", "product"],
    summary:
      "Reference index of real published coach programs — structure, splits and rep schemes.",
    related: ["Coach Methodologies", "VitalEdge Hub"],
  },
  {
    src: "product-research/competitor-pain-points-2026.md",
    folder: "resources",
    slug: "competitor-pain-points",
    title: "Competitor Pain Points",
    tags: ["competitors", "research"],
    summary:
      "User sentiment and pain points across competitor fitness/nutrition apps (July 2026).",
    related: ["Market Intelligence", "VitalEdge Hub"],
  },
  {
    src: "product-research/injury-adaptation-research.md",
    folder: "resources",
    slug: "injury-adaptation-research",
    title: "Injury Adaptation Research",
    tags: ["rehab", "research", "product"],
    summary:
      "Jordan Shallow / Pre-Script rehab research for VitalEdge's injury-adaptation ruleset.",
    related: ["Coach Methodologies", "VitalEdge Hub"],
  },
  {
    src: "engineering/architecture-audit-2026-06.md",
    folder: "resources",
    slug: "architecture-audit",
    title: "Architecture Audit",
    tags: ["engineering", "vitaledge", "audit"],
    summary:
      "Senior-engineer architecture audit of the VitalEdge Hub codebase (June 2026).",
    related: ["VitalEdge Hub", "GHL AI Automation"],
  },
  {
    src: "engineering/ghl-ai-automation-2026-07.md",
    folder: "resources",
    slug: "ghl-ai-automation",
    title: "GHL AI Automation",
    tags: ["engineering", "ghl", "automation"],
    summary: "Tooling notes on Claude-driven GoHighLevel workflow automation.",
    related: ["VitalEdge Hub", "Architecture Audit"],
  },
];

/** Strip an existing YAML frontmatter block, if any, from raw markdown. */
function stripFrontmatter(raw: string): string {
  const match = raw.match(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? raw.slice(match[0].length) : raw;
}

function yamlList(items: string[]): string {
  return `[${items.join(", ")}]`;
}

function buildNote(spec: ImportSpec, body: string): string {
  const frontmatter = [
    "---",
    `title: ${spec.title}`,
    `folder: ${spec.folder}`,
    `tags: ${yamlList(spec.tags)}`,
    `created: ${TODAY}`,
    `updated: ${TODAY}`,
    "source: import",
    `summary: ${JSON.stringify(spec.summary)}`,
    "---",
    "",
  ].join("\n");

  const related =
    spec.related.length > 0
      ? `\n\n## Related\n${spec.related.map((t) => `- [[${t}]]`).join("\n")}\n`
      : "\n";

  return `${frontmatter}${body.trim()}${related}`;
}

async function main(): Promise<void> {
  let written = 0;
  for (const spec of IMPORTS) {
    const srcPath = path.join(intelDir, spec.src);
    const raw = await readFile(srcPath, "utf-8");
    const body = stripFrontmatter(raw);
    const note = buildNote(spec, body);

    const destDir = path.join(vaultDir, spec.folder);
    await mkdir(destDir, { recursive: true });
    const destPath = path.join(destDir, `${spec.slug}.md`);
    await writeFile(destPath, note, "utf-8");

    const words = body.trim().split(/\s+/).length;
    console.log(
      `[import] ${spec.folder}/${spec.slug}.md  "${spec.title}"  (${words} words, ${spec.related.length} links)`,
    );
    written += 1;
  }
  console.log(`[import] Done — ${written} notes written to ${vaultDir}`);
}

main().catch((err) => {
  console.error("[import] Failed:", err);
  process.exit(1);
});
