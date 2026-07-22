# What's Built

## Phase 1 — COMPLETE ✅

| Task | Status | Summary |
|------|--------|---------|
| 1 — Scaffold | ✅ | Vite React (:5174) + Express/tRPC (:3001), Drizzle schema, sample vault, `npm run dev` |
| 2 — Vault engine | ✅ | Frontmatter + wikilink parser, PL scoring, `npm run reindex`, chokidar watcher (when DB set) |
| 3 — Graph API + UI | ✅ | `graph.get`, canvas graph (zoom/pan/tap, flame aura, folder colors), HUD ↔ GRAPH toggle |
| 4 — HUD screen | ✅ | Portrait upload, PL scan, energy reading, radar, folder cards, agent battle log |
| 5 — Note CRUD | ✅ | Create/edit/delete notes from UI; writes valid `.md` to vault; folder picker; markdown preview |

**Test count:** 42/42 passing (verified 2026-07-12).

**Phase 1 definition of done:** Christian can open the app, see HUD + graph, tap a note to read it, create a note, upload portrait. ✅ (PIN/deploy = Phase 5)

**Next gate:** Phase 1 review with Christian before Phase 2 (RAG chat).

---

## Session log

### 2026-07-22 — Phase 5 Task 4: Real vault import
**Changed:**
- Added `server/scripts/import-intel.ts` + `npm run import:intel` — repeatable seeder that copies Christian's curated `Desktop/Intelligence/` markdown into the vault with valid frontmatter (`source: import`) and cross-links.
- Imported 9 real knowledge files into `vault/resources/`: Pinnacle Soul File (v3.1), Marketing Playbook (Willington), Market Intelligence, Coach Methodologies, Coach Program Library, Competitor Pain Points, Injury Adaptation Research, Architecture Audit, GHL AI Automation. ~38k words total.
- Overwrote placeholder `pinnacle-soul-file.md` and `marketing-playbook.md` with the real content (titles kept, so existing inbound wikilinks stay intact).

**Verified:** Indexer parse over vault → **18 notes, 41 links, 0 unresolved wikilinks**; all frontmatter valid. Real Marketing Playbook is now the top graph hub (PL ~13,300), Market Intelligence next (~10,300). Reindex → MySQL + Voyage embeddings populated for RAG.

**Raw findings:**
- Wikilinks resolve against note `title` (case-insensitive), not filename — cross-links target existing hub titles (VitalEdge Hub, MFP Campaign, Pinnacle Coaching) so nothing orphans.
- Skipped 3 non-knowledge meta files in `Intelligence/` (MANUS-PROMPT, PLACEMENT-PROMPT, README consolidation log) — agent prompts, not vault content. Available if wanted.
- PDF deliverables in `Intelligence/deliverables/` not imported (PDF import still deferred, per Phase 4/Backlog).

**Next:** Phase 5 done bar deploy — push to Railway with the vault volume so it's installable + PIN-gated on phone.

### 2026-07-20 — Phase 5: PWA + PIN + Railway
**Changed:**
- PWA via `vite-plugin-pwa` (manifest, service worker, scouter SVG icons)
- PIN lock: `server/lib/auth/pin.ts`, `auth.*` tRPC, PinGate UI, cookie credentials, API pinGuard
- `npm run pin:hash`, `.env.example` keys
- Dockerfile + railway.json; Express serves `dist/client` in production

**Verified:** pin/auth/router/crud tests pass; `npm run build` emits SW + webmanifest.

**Raw findings:** PIN optional — unset `APP_PIN_HASH` = no gate (local/dev).

**Next:** Real vault import when Christian provides source files; then deploy smoke on Railway.

---
### 2026-07-19 — Phase 4 closed (inbox skipped)
**Changed:** Idea inbox skipped (＋ New Note enough). PDF already deferred. Phase 4 core (CREATE/DECIDE) treated complete; advanced to Phase 5 ship queue.

**Next:** Phase 5 — PWA / PIN / Railway / real vault import (when Christian says start).

---
### 2026-07-19 — Phase 4 Task 2: DECIDE mode
**Changed:** `decide.ts` + `retrieve` `folderPrefix`; `chat.decide` scoped to `warroom/`. UI DECIDE chip → WAR ROOM reply panel.

**Verified:** citations/paths all under `warroom/` in live test.

**Next:** PDF import.

---
### 2026-07-19 — Phase 4 Task 1: CREATE mode
**Changed:** `chat.create` + `create.ts` (Soul File + Marketing Playbook anchors + RAG). UI: ASK/CREATE mode chips, WRITE button, CREATE DRAFT panel, SAVE AS NOTE opens editor prefilled.

**Verified:** `create.test.ts` + live `chat.create` draft grounded when keys/embeddings present.

**Raw findings:** CREATE always merges framework embeds even if retrieval ranks them low.

**Next:** DECIDE mode (warroom pathFilter / decision log).

---
### 2026-07-18 — Phase 3 signed off ("happy")
**Changed:** Marked Phase 3 complete; advanced `whats-next.md` to Phase 4 (CREATE / DECIDE / PDF / idea inbox).

**Verified:** Christian sign-off.

**Next:** Start Phase 4 Task 1 — CREATE mode.

---
### 2026-07-18 — Orphan detection (Phase 3 complete)
**Changed:** `orphans.ts` — notes with zero wiki links (excludes archive). `orphans.list` / `orphans.quarantine` move file + frontmatter into `unsorted`. Red SCOUTER ERROR panel + HUD orphan count.

**Verified:** Unit + tRPC quarantine tests pass.

**Raw findings:** Quarantine is tap-based (FILE), not auto-move — keeps vault intentional.

**Next:** Phase 3 sign-off → Phase 4 (CREATE/DECIDE + PDF).

---
### 2026-07-18 — Auto-tag + summary; PL verified
**Changed:** `enrichNote.ts` — on create/update, if tags/summary blank and body ≥40 chars, Claude fills frontmatter (never overwrites user input). NoteEditor placeholders “blank = auto”. PL task marked done (formula already live).

**Verified:** `enrichNote.test.ts` parser cases; CRUD/router still pass (short test bodies skip enrich).

**Raw findings:** Enrich skipped under 40-char body to avoid stub/test API noise.

**Next:** Orphan detection → suggest/move to unsorted (SCOUTER ERROR).

---
### 2026-07-17 — Phase 3 kickoff: auto-linking
**Changed:** Phase 2 marked complete. Auto-link pipeline: `autolink.ts` (propose/accept/reject), `embedNotePath` on note save, `links.*` tRPC, dashed gold AI edges on graph, LINK PROPOSALS panel (✓ writes `[[wikilink]]` to vault / ✕ dismisses).

**Verified:** `links.test.ts` + `router.test.ts` pass; graph edges carry `type: wiki|ai`.

**Raw findings:**
- Real PL already existed from Phase 1 (`computePlScore`) — Task 2 is verification, not greenfield
- Rejected AI pairs are blocked from re-propose (by design)

**Next:** Try save/edit a note or open GRAPH for LINK PROPOSALS; then auto-tag/summary + orphans.

---
### 2026-07-17 — Node-scoped chat polish
**Changed:** Explicit note-scoped ASK (was broken: note overlay z-index hid the chat bar). Note panel **ASK** sets `chatScope` → LOCKED ON chip → `pathFilter`; ✕ returns to vault-wide. Chat no longer auto-scopes just because a note is open.

**Verified:** `chat.test.ts` pathFilter retrieve + ask citations stay on `projects/vitaledge-hub.md`.

**Raw findings:** Overlay at z-index 100 vs chat bar 50 made “Ask about this” unreachable while reading.

**Next:** Phase 2 sign-off from Christian, then Phase 3.

---
### 2026-07-17 — Keys live, reindex + ASK verified
**Changed:** Restored empty `server/lib/rag/retrieve.ts` (`embedVaultNotes` + `retrieveChunks`). Ran full reindex with Voyage.

**Verified:** Health `embeddingCount: 11`, voyage/anthropic configured. Smoke ask: “What projects are in the vault?” returned grounded answer + citation paths.

**Raw findings:**
- `retrieve.ts` had been emptied (import broke reindex) — restored from prior session
- Dev server running for UI tryout

**Next:** Christian hard-refreshes and uses the chat bar; polish node-scoped chat if needed; then Phase 2 sign-off.

---
### 2026-07-17 — Phase 2 Scouter core (embeddings + ASK)
**Changed:**
- MySQL connected via `.env` `DATABASE_URL` (verified `DB_STATUS=ok`; tables `notes_index`, `links`, `embeddings` present)
- RAG: `chunk.ts`, Voyage `embed.ts`, `retrieve.ts`, `ask.ts`
- `invokeLLM.ts` wired to `@anthropic-ai/sdk`
- `chat.ask` tRPC mutation; health reports `voyageConfigured` / `anthropicConfigured` / `embeddingCount`
- `npm run reindex` writes notes_index + embeddings (skips embeddings without Voyage key)
- Client chat bar live: ASK → answer panel → citation chips → ignite graph nodes; open-note scopes ask via `pathFilter`

**Verified:** MySQL reindex writes notes/links; embeddings skipped until `VOYAGE_API_KEY`; tests run after indexer ENOENT race fix.

**Raw findings:**
- `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` still missing from `.env` — chat will error until added
- Local MySQL DB name `saiyan_archive` (not Railway URL length — still fine)

**Next:** Christian adds Voyage + Anthropic keys → `npm run reindex` → hard-refresh → ask the vault.

---
**Changed:** Christian signed off Phase 1 ("HAPPY"). Updated `whats-next.md` to Phase 2. Started Task 1 with `server/lib/rag/chunk.ts` (pure text chunker). Added `VOYAGE_API_KEY` to `.env.example` (Anthropic-recommended embeddings).

**Verified:** Phase 1 HUD redesign live on client; 42+ tests baseline.

**Raw findings:**
- Embeddings provider = Voyage (not Anthropic) — Anthropic docs recommend Voyage for RAG
- Phase 2 needs three env vars: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`

**Next:** Finish embeddings pipeline (Voyage client + write to MySQL + hook reindex) once keys available; then invokeLLM; then ASK chat bar.

---
**Changed:** Ported PR #10 redesign (`sa-*` CSS, 2-column HUD, GraphCanvas, SCROLL/GRAPH tabs, chat bar chrome) from unused root `src/` into live `client/src/`. Adapted data layer to existing APIs (`hud.get`, `notes.*`, `graph.get`, `vault.list`, `portrait.upload`) instead of removed `vault.meta/get/create`.

**Verified:** Live bundle at :5175 serves `sa-root` App + Bungee/Saira fonts; `hud.get` OK; 42/42 tests pass.

**Raw findings:**
- `npm run dev` uses `client/vite.config.ts` only — root `src/` redesign was never served
- Merge conflict earlier had swapped server to vault-CRUD-only API; restored `hud`/`notes` for client, then ported UI

**Next:** Hard-refresh browser on http://localhost:5175 — expect split HUD (folders left / portrait+PL+energy+radar right), SCROLL tab, bottom chat bar.

---

## Phase 1, Task 5 — Note CRUD (complete)

### What changed
- **Notes API** (`notes.get/create/update/delete`) + `vault.list`: read/write/delete `.md` files in `vault/` with valid frontmatter.
- **Note UI**: redesign NoteEditor with folder picker; SCROLL list; create/edit/delete from HUD.
- After save/delete, graph + HUD + folder counts refresh via React Query invalidation.

### Verified working
- `npm run test` — 42/42 including notes CRUD
- Create → read → update → delete round-trip on disk
- All writes include required frontmatter (`source: user` on UI-created notes)

---

## Phase 1, Task 4 — HUD Screen (complete)

HUD layout, portrait upload, battle log (agent notes only), folder cards, PL scan.

---

## Phase 1, Task 3 — Graph API + UI (complete)

`graph.get`, GraphCanvas renderer, HUD ↔ GRAPH toggle, folder filters.

---

## Phase 1, Task 2 — Vault Engine (complete)

Parser, indexer, PL formula, `npm run reindex`, chokidar watcher. File-scan default without MySQL.

---

## Phase 1, Task 1 — Scaffold (complete)

Vite + React frontend, Express + tRPC backend, Drizzle schema, sample vault, `npm run dev`.

Design mock approved: `design/brain-v10-hud.jsx`

---

## Session log

### 2026-07-09 — Phase 1 close-out verification
**Changed:** No new code. Confirmed all 5 Phase 1 tasks complete; updated `whats-next.md` to mark Phase 1 done and gate Phase 2 on review.

**Verified:** `npm run test` — 38/38 pass. Full feature set present: HUD (portrait, PL scan, energy, radar, battle log, vault sync status), graph (zoom/pan/tap, folder toggles), note CRUD, folder cards, mobile-first layout.

**Raw findings:**
- All numbered tasks in whats-next were already ✅ before this session
- START-HERE.md step 6: stop for Phase 1 review before RAG chat
- Phase 2 requires MySQL + Anthropic API key; invokeLLM is still a stub

**Next:** Christian reviews Phase 1 in the browser; then Phase 2 Task 1 (embeddings pipeline).

### 2026-07-08 — Task 5 Note CRUD
**Changed:** Added `vault.*` tRPC procedures, vault writer module, NoteEditor, SCROLL/+ NEW actions.

**Verified:** CRUD cycle writes valid markdown to vault.

**Raw findings:**
- No MySQL required — UI invalidates queries and file-scan picks up new notes immediately

**Next:** Phase 2 — RAG chat (do not start until Phase 1 review).

### 2026-07-08 — Task 4 HUD Screen
Full HUD layout, portrait upload, battle log, radar.

### 2026-07-08 — Task 3 Graph API + UI
Graph API + canvas renderer.

### 2026-07-08 — Task 2 Vault Engine
Vault reader, indexer, watcher, reindex.

### 2026-07-08 — Task 1 Scaffold
Project skeleton.
