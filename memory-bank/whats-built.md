# What's Built

## Phase 1, Task 2 — Vault Engine (complete)

### What changed
- **Vault parser** (`server/lib/vault/parse.ts`): reads frontmatter (title, folder, tags, dates, source, summary) and extracts `[[wikilinks]]` including aliased links (`[[Target|label]]`).
- **Indexer** (`server/lib/vault/indexer.ts`): scans `vault/`, resolves wikilinks by note title, computes PL scores, builds notes + edges payload.
- **PL scoring** (`server/lib/vault/plScore.ts`): `500 + inbound_links*800 + sqrt(word_count)*40 + recency_bonus`.
- **Database writer** (`server/lib/vault/db.ts`): full rebuild of `notes_index` + wiki `links` tables from vault.
- **`npm run reindex`**: scans vault, resolves 11 wiki edges across 5 sample notes, writes to MySQL when `DATABASE_URL` set; otherwise parses and reports.
- **Chokidar watcher** (`server/lib/vault/watcher.ts`): on server boot (when DB configured), watches `vault/**/*.md` and debounced re-index on add/change/delete.
- **API updates**: `health` returns `indexedNoteCount`; `vault.list` returns notes with PL scores (from DB if available, else file scan).
- **UI**: notes now show PL scores; status shows indexed count and DB online/offline.
- **Tests**: 13 passing — parse, wikilink extraction, link resolution, PL scoring, rebuild-from-vault, tRPC procedures.

### Verified working
- `npm run test` — 13/13 pass
- `npm run reindex` — 5 notes, 11 wiki edges resolved, 0 unresolved
- Works without MySQL (file-scan fallback); DB write when `DATABASE_URL` configured
- Server auto-indexes + starts watcher on boot when DB available

### Raw findings
- `gray-matter` parses YAML dates as `Date` objects — normalized to `YYYY-MM-DD` strings before Zod validation.
- Sample vault has 11 wiki edges, all resolve cleanly by title match.
- Marketing Playbook is the hub (most inbound links) — highest PL score among sample notes.

---

## Phase 1, Task 1 — Scaffold (complete)

### What changed
- Replaced BizLens Next.js app with Saiyan Archive monorepo scaffold.
- Created `memory-bank/` with all five project docs.
- **Frontend**: Vite + React 18 on port 5174. DBZ-themed status screen (mobile 412px layout).
- **Backend**: Express + tRPC on port 3001.
- **Database**: Drizzle ORM schema for `notes_index`, `links`, `embeddings` tables.
- **Vault**: `vault/` with 5 sample notes across folders with `[[wikilinks]]`.
- **Dev**: `npm run dev` starts both servers via concurrently.

Design mock approved: `design/brain-v10-hud.jsx` (HUD cards + graph toggle, Vegeta-kit palette, portrait slot).

## Session log
### 2026-07-08 — Task 2 Vault Engine
Built vault reader, wikilink parser, PL scorer, DB indexer, chokidar watcher, and full `npm run reindex`. 13 tests passing. Ready for Task 3 (Graph API + UI).

### 2026-07-08 — Task 1 Scaffold
Built full project skeleton: Vite React frontend, tRPC/Express backend, Drizzle/MySQL config, vault with 5 interlinked sample notes. `npm run dev` boots both. Tests pass.
