# Tech Stack — Saiyan Archive

## Stack
- **Frontend**: React 18 + Vite, single-page PWA. Canvas graph renderer (no d3 dependency — port from design mock).
- **Backend**: Node 20 + tRPC + Express adapter. Port 3001.
- **DB**: MySQL 8 via Drizzle ORM (same as VitalEdge — familiar patterns). Holds DERIVED data only.
- **Vault**: `vault/` directory of .md files. Source of truth. Obsidian-compatible.
- **Watcher**: chokidar re-indexes on file change.
- **LLM**: Anthropic API via `server/lib/invokeLLM.ts` wrapper (same pattern as VitalEdge). Model: claude-sonnet-4-6 for chat + linking; embeddings via voyage or equivalent — check current Anthropic docs at build time.
- **Deploy**: Railway (Dockerfile + railway.json). Vault persisted on Railway volume, mirrored to a private GitHub repo (git commit on change, debounced 5 min).

## Vault file schema
```markdown
---
title: MFP Campaign
folder: projects        # projects|areas|resources|warroom|archive|unsorted
tags: [marketing, vitaledge]
created: 2026-07-08
updated: 2026-07-08
source: user            # user|manus|claude-code|candice|import
summary: One-line AI summary.
---
Body markdown. [[Wikilinks]] create edges.
```

## MySQL tables (all rebuildable from vault via `npm run reindex`)
- `notes_index(path PK, title, folder, updated, word_count, pl_score)`
- `links(source_path, target_path, type ENUM('wiki','ai'), confidence FLOAT, accepted BOOL)`
- `embeddings(path, chunk_idx, text, vector JSON)`

## PL score formula
`pl = 500 + inbound_links*800 + sqrt(word_count)*40 + recency_bonus` where recency_bonus = 3000 * exp(-days_since_update/30). Hubs naturally exceed 9000.

## Constraints
- Single user. PIN lock only (hashed PIN in env var, session cookie). No accounts.
- Mobile-first: HUD card layout default; graph full-width; test at 412px.
- All AI features must degrade gracefully if API key missing (graph + notes still work).
- Portrait: user-uploaded image only, stored at `vault/assets/portrait.png`. Never bundle character artwork.
