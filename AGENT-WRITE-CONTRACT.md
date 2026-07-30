# Saiyan Archive — Agent Write Contract

Use this contract for Claude Code, Manus, Candice, or any automation that
writes knowledge into Saiyan Archive.

## Connection model

Saiyan Archive uses the markdown vault as its integration surface. An agent
connects by writing a `.md` file under `vault/`; it does not write directly to
MySQL. MySQL is derived and rebuilt with `npm run reindex`.

Remote agents that cannot access the same filesystem need a sync mechanism or
future authenticated inbox API. Do not improvise a direct database write.

## Allowed folders

- `vault/projects/` — active deliverables with an end state
- `vault/areas/` — ongoing responsibilities and businesses
- `vault/resources/` — research, references, frameworks, playbooks
- `vault/warroom/` — accepted decisions, rationale, review triggers
- `vault/archive/` — inactive historical material
- `vault/unsorted/` — captures that still need filing

Do not create new top-level folders without updating the application schema.
Do not write markdown under `vault/assets/`.

## Required frontmatter

Every note must begin with:

```yaml
---
title: Unique human-readable title
folder: resources
tags: [research, vitaledge]
created: 2026-07-30
updated: 2026-07-30
source: claude-code
summary: One factual sentence describing the note.
---
```

Rules:

- `folder`: `projects | areas | resources | warroom | archive | unsorted`
- `source`: `user | manus | claude-code | candice | import`
- Dates: `YYYY-MM-DD`
- `title` must be unique across the vault
- The frontmatter `folder` must match the path folder
- `tags` must be a YAML list
- `summary` should describe evidence in the note, not invent conclusions

## Body and wikilinks

- Write useful markdown below the frontmatter.
- Link related notes with `[[Exact Note Title]]`.
- Wikilinks resolve by frontmatter `title` (case-insensitive), not filename.
- Prefer linking to existing hubs over duplicating their content.
- If a fact came from an external source, include its URL and access date.
- Never include API keys, credentials, client health data, or other secrets.

Example:

```markdown
---
title: Competitor Pricing Scan
folder: resources
tags: [competitor, pricing, vitaledge]
created: 2026-07-30
updated: 2026-07-30
source: manus
summary: Pricing observations for three products competing with VitalEdge Hub.
---

# Competitor Pricing Scan

Findings...

Related: [[VitalEdge Hub]] and [[Market Intelligence]]
```

## Safe write procedure

1. Read existing titles before choosing a title or wikilink.
2. Write to a temporary file when possible, then atomically rename to `.md`.
3. Run `npm run validate:vault`.
4. Fix validation errors before handing off. Unresolved wikilinks are warnings
   and should be fixed unless intentionally awaiting another note.
5. If the watcher and database are running, indexing happens automatically.
   Otherwise run `npm run reindex`.
6. Confirm the note appears in SCROLL/GRAPH and that citations can open it.

## Updating an existing note

- Preserve `created` and `source`.
- Set `updated` to today.
- Preserve existing evidence and wikilinks unless the update intentionally
  supersedes them.
- Do not silently move a note between folders; make that explicit in the task.

## Forbidden actions

- Do not write notes directly to MySQL.
- Do not modify or delete user notes without explicit authorization.
- Do not auto-accept AI link proposals.
- Do not place secrets in the vault.
- Do not create client-per-node health records without a completed security
  review.
