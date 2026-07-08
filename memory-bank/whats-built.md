# What's Built

## Phase 1, Task 5 — Note CRUD (complete) — PHASE 1 DONE ✅

### What changed
- **`vault.create` tRPC mutation**: title + folder + tags + summary + body → writes valid `.md` to vault with correct frontmatter. Auto-generates slug filename from title.
- **`vault.update` tRPC mutation**: patches any field on an existing note, preserves original `created` date, bumps `updated` to today.
- **`vault.delete` tRPC mutation**: deletes note file from vault by path.
- **`server/lib/vault/writer.ts`**: `serializeNote`, `writeNote`, `buildNotePath`, `buildFrontmatter`, `deleteNote` helpers. Guarantee valid frontmatter on every write (rule 2 enforced).
- **NoteEditor component** (`src/components/NoteEditor.tsx`): title input, folder picker (dropdown), tags input (comma-separated), summary input, WRITE/PREVIEW tabs. Preview renders basic markdown (bold, italic, headings, wikilinks). Two-tap delete confirm.
- **App UI**: `＋` tab in header opens new note editor. Edit (✎) button in note reader opens edit editor. Reload after create/update/delete keeps graph and HUD live.
- **Tests**: 20 passing — 4 new CRUD tests (create, duplicate rejection, update body, delete).

### Verified working
- `npm run test` — 20/20 pass
- Create note → appears in list, graph, and HUD folder count
- Edit note → body and title update, `updated` date bumps
- Delete note → removed from vault and all views
- Preview tab renders headings, bold, italic, wikilinks styled

### Phase 1 Definition of Done — MET
Christian can open the app, see notes as HUD + graph, tap a note to read it, create a note, upload portrait. No AI. ✅

---

## Phase 1, Task 4 — HUD Screen (complete)

### What changed
- **HUD tab** as default view — portrait slot, PL scanner, energy reading, radar, folder cards, battle log.
- **Portrait slot** (`PortraitSlot.tsx`): tap or drag-drop to upload image → `POST /assets/portrait` → saves to `vault/assets/portrait.png`. `GET /assets/portrait` serves it back. Persists across restarts.
- **Power Level Scanner** (`PlScanner.tsx`): POWER LEVEL SCAN button triggers flicker animation, then reveals top-scoring note's PL. Shows "IT'S OVER 9000!!!" in scouter red when threshold crossed.
- **Energy Reading** (`EnergyReading.tsx`): bar + STABLE/ELEVATED/CRITICAL label based on link density (links ÷ notes).
- **Radar chart** (`RadarChart.tsx`): SVG pentagon radar — one axis per folder, hub PL plotted as area. Shows at a glance which folders are most connected.
- **Folder cards** (`FolderCards.tsx`): 3×2 grid, each card shows folder rank label, name, and live note count. Tap to filter note list below.
- **Battle log** (`BattleLog.tsx`): lists notes where `source != user` — shows which agent (MANUS, CLAUDE CODE, CANDICE) wrote what.
- **`vault.meta` tRPC procedure**: returns path, title, folder, source, updated, plScore for all notes.
- **Portrait REST endpoints**: `GET/POST /assets/portrait` on Express.
- **3-tab layout**: HUD · GRAPH · NOTES.
- **Tests**: 16 passing.

### Verified working
- `npm run test` — 16/16 pass
- HUD renders with all 5 cards
- PL scanner animates and shows top note score
- Radar chart shows hub positions from sample vault
- Folder cards show correct counts (projects=1, areas=1, etc.)
- Battle log shows empty (all sample notes source=user — correct)
- Portrait upload endpoint functional

### Raw findings
- All 5 sample notes have `source: user` — battle log shows empty (correct behaviour; will populate when agents write notes in Phase 2+).
- Portrait image persists to vault/assets/portrait.png — survives server restarts.

---

## Phase 1, Task 3 — Graph API + UI (complete)

### What changed
- **`graph.get` tRPC procedure**: returns nodes (id, title, folder, plScore) + edges (source, target). Reads from DB when configured, falls back to file scan.
- **`vault.get` tRPC procedure**: returns raw markdown for a note path (used by tap-to-read).
- **Force-directed layout** (`src/lib/graphLayout.ts`): pure JS simulation (no d3) — repulsion, edge attraction, centre gravity. Runs 120 iterations on mount. Node radius scaled by PL score.
- **Canvas renderer** (`src/components/GraphCanvas.tsx`): animated RAF loop, flame aura glow per node (radial gradient, pulsing), folder colour-coded dots, edge lines, zoom/pan via pointer events, tap-to-select.
- **Folder colours** (`src/lib/graphColors.ts`): projects=blue, areas=gold, resources=white, warroom=light-blue, archive/unsorted=grey.
- **Legend** (`src/components/GraphLegend.tsx`): colour key for all folders.
- **App UI**: GRAPH / NOTES tab toggle. Tapping a node or list row opens inline note reader panel. Status chips (notes count, links count, DB status).
- **Tests**: 15 passing — added graph.get and vault.get procedure tests.

### Verified working
- `npm run test` — 15/15 pass
- Graph renders 5 nodes with coloured aura, 11 link edges
- Zoom (wheel/pinch), pan (drag), tap node → note content appears
- NOTES tab lists all notes with PL scores, clickable
- Mobile 412px layout: canvas fills width, hint text below

### Raw findings
- No design mock file in repo — built from spec descriptions in projectbrief.md.
- Canvas fixed at 412×560 internal resolution; CSS `width: 100%` handles all screen sizes.
- Force layout is deterministic given same input order; nodes sorted by path before layout.

---

## Phase 1, Task 2 — Vault Engine (complete)

### What changed
- Vault parser, indexer, PL scorer, DB writer, chokidar watcher, `npm run reindex`.
- 13 tests, all passing.

---

## Phase 1, Task 1 — Scaffold (complete)

### What changed
- Vite React frontend, tRPC/Express backend, Drizzle/MySQL config, vault with 5 sample notes.

Design mock approved: `design/brain-v10-hud.jsx` (HUD cards + graph toggle, portrait slot).

## Session log
### 2026-07-08 — Task 3 Graph API + UI
Built graph.get + vault.get procedures, force-directed canvas renderer, zoom/pan/tap, flame aura, folder colours, tab toggle, inline note reader. 15 tests pass. Ready for Task 4 (HUD screen).

### 2026-07-08 — Task 2 Vault Engine
Built vault reader, wikilink parser, PL scorer, DB indexer, chokidar watcher. 13 tests pass.

### 2026-07-08 — Task 1 Scaffold
Built full project skeleton. npm run dev boots both servers. Tests pass.
