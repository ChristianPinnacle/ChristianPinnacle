# What's Built

## Phase 1, Task 1 — Scaffold (complete)

### What changed
- Replaced BizLens Next.js app with Saiyan Archive monorepo scaffold.
- Created `memory-bank/` with all five project docs (`projectbrief`, `techstack`, `whats-built`, `whats-next`, `rules`).
- **Frontend**: Vite + React 18 on port 5174. DBZ-themed status screen (mobile 412px layout). Connects to backend via tRPC client.
- **Backend**: Express + tRPC on port 3001. Procedures: `health`, `vault.list`, `echo`.
- **Database**: Drizzle ORM schema for `notes_index`, `links`, `embeddings` tables. `drizzle.config.ts` + `db:generate`/`db:migrate` scripts. Connection optional until Task 2.
- **Vault**: `vault/` with 5 sample notes across folders (`projects`, `areas`, `resources`, `warroom`, `unsorted`). All have valid frontmatter; notes cross-link via `[[wikilinks]]`.
- **Stubs**: `server/lib/invokeLLM.ts` (throws until Phase 2), `server/scripts/reindex.ts` (counts notes, full index in Task 2).
- **Tests**: 3 vitest tests for tRPC procedures (health, vault.list, echo) — all passing.
- **Dev**: `npm run dev` starts both servers via concurrently.

### Verified working
- `npm install` — clean install, 246 packages
- `npm run test` — 3/3 tests pass
- `npm run dev` — server on :3001, Vite on :5174
- `curl http://localhost:3001/health` → `{"status":"ok"}`
- tRPC `health` → `{ status: "ok", vaultNoteCount: 5, dbConfigured: false }`
- `npm run reindex` → finds 5 vault notes, reports stub status

### Raw findings
- No MySQL instance in this environment; `DATABASE_URL` not set. App degrades gracefully — graph/notes work without DB (per techstack constraint).
- Old BizLens files removed entirely; repo is now Saiyan Archive only.
- `design/brain-v10-hud.jsx` not present in repo yet — needed for Tasks 3–4.

Design mock approved: `design/brain-v10-hud.jsx` (HUD cards + graph toggle, Vegeta-kit palette, portrait slot).

## Session log
### 2026-07-08 — Task 1 Scaffold
Built full project skeleton: Vite React frontend, tRPC/Express backend, Drizzle/MySQL config, vault with 5 interlinked sample notes. `npm run dev` boots both. Tests pass. Ready for Task 2 (vault engine).
