# What's Built

## Phase 1 — COMPLETE ✅

| Task | Status | Summary |
|------|--------|---------|
| 1 — Scaffold | ✅ | Vite React (:5174) + Express/tRPC (:3001), Drizzle schema, sample vault, `npm run dev` |
| 2 — Vault engine | ✅ | Frontmatter + wikilink parser, PL scoring, `npm run reindex`, chokidar watcher (when DB set) |
| 3 — Graph API + UI | ✅ | `graph.get`, canvas graph (zoom/pan/tap, flame aura, folder colors), HUD ↔ GRAPH toggle |
| 4 — HUD screen | ✅ | Portrait upload, PL scan, energy reading, radar, folder cards, agent battle log |
| 5 — Note CRUD | ✅ | Create/edit/delete notes from UI; writes valid `.md` to vault; folder picker; markdown preview |

**Test count:** 38/38 passing (verified 2026-07-09).

**Phase 1 definition of done:** Christian can open the app, see HUD + graph, tap a note to read it, create a note, upload portrait. ✅

**Next gate:** Phase 1 review with Christian before Phase 2 (RAG chat).

---

## Phase 1, Task 5 — Note CRUD (complete)

### What changed
- **Notes API** (`notes.get`, `notes.create`, `notes.update`, `notes.delete`): read/write/delete `.md` files in `vault/` with valid frontmatter every time.
- **Vault writer** (`server/lib/vault/notes.ts`): serializes frontmatter, slugifies titles, handles folder moves on edit.
- **Note UI**: NoteList, NoteView, NoteEditor with folder picker, WRITE/PREVIEW toggle, wikilink-friendly textarea.
- **App actions**: bottom **NOTES** + **+ NEW** buttons; graph selected node → **OPEN NOTE**; delete with confirm dialog.
- After save/delete, graph + HUD + folder counts refresh automatically (file-scan, no MySQL needed).

### Verified working
- `npm run test` — 38/38 pass (includes note module + tRPC CRUD integration test)
- Create → read → update (including folder move) → delete round-trip on disk
- All writes include required frontmatter (`source: user` on UI-created notes)

---

## Phase 1, Task 4 — HUD Screen (complete)

HUD API, portrait upload, battle log (agent notes only), full v10 card layout, 3 agent sample notes.

---

## Phase 1, Task 3 — Graph API + UI (complete)

`graph.get`, GraphPane canvas, HUD ↔ GRAPH toggle, folder filters, PL scan on node tap.

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

**Verified:** `npm run test` — 38/38 pass. Full feature set present: HUD (portrait, PL scan, energy, radar, battle log, vault sync status), graph (zoom/pan/tap, folder toggles, OPEN NOTE), note CRUD (list/view/create/edit/delete), folder cards, mobile-first layout.

**Raw findings:**
- All numbered tasks in whats-next were already ✅ before this session
- START-HERE.md step 6: stop for Phase 1 review before RAG chat
- Phase 2 requires MySQL + Anthropic API key; invokeLLM is still a stub

**Next:** Christian reviews Phase 1 in the browser; then Phase 2 Task 1 (embeddings pipeline).

### 2026-07-08 — Task 5 Note CRUD
**Changed:** Added `notes.*` tRPC procedures, vault read/write module, NoteList/NoteView/NoteEditor components, NOTES/+ NEW action bar, OPEN NOTE from graph.

**Verified:** 38/38 tests pass. Full create/read/update/delete cycle writes valid markdown to vault.

**Raw findings:**
- Folder change on edit renames file (e.g. `unsorted/foo.md` → `projects/foo.md`)
- No MySQL required — UI invalidates queries and file-scan picks up new notes immediately

### 2026-07-08 — Task 4 HUD Screen
Full HUD layout, portrait upload, battle log, radar. 34 tests at completion.

### 2026-07-08 — Task 3 Graph API + UI
Graph API + canvas renderer.

### 2026-07-08 — Task 2 Vault Engine
Vault reader, indexer, watcher, reindex.

### 2026-07-08 — Task 1 Scaffold
Project skeleton.
