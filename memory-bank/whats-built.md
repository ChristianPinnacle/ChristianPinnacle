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

### 2026-08-03 — Daily research auto-file cron
**Changed:**
- `server/lib/rag/dailyResearch.ts` auto-searches hypertrophy, strength, injury rehab, endurance training, weight lifting; writes one `resources/daily-*-DATE.md` per topic plus `warroom/daily-research-DATE.md` summary (same-day overwrite / skip without `--force`).
- `npm run research:daily`, HUD **DAILY RESEARCH**, and `research.runDaily` tRPC mutation.
- Topics overridable via `DAILY_RESEARCH_TOPICS`.

**Verified:** helper tests + research.status topics; typecheck/build after wiring.

**Raw findings:** Still needs `TAVILY_API_KEY` + Railway cron to run unattended. Notes land in the vault (SoT); DB embeddings follow via watcher/`afterNoteWrite`/reindex — not a separate “studies table.”

**Next:** Christian adds Tavily key + Railway cron; Phase 5 ASK/phone QA.

### 2026-08-03 — Backlog sprint: PDF, inbox, research, voice, OCR
**Changed:**
- PDF import via `pdf-parse` → `unsorted` with `source: import`; fails clearly on scanned/image-only PDFs.
- Idea inbox: chat **INBOX** mode + optional Express `POST /inbox` gated by `INBOX_SECRET`.
- Research agent: Tavily search + Claude proposals; UI FILE/✕ approve-before-write (never silent-writes).
- Voice: browser SpeechRecognition fills INBOX draft (Chrome/Safari).
- OCR: Anthropic vision through `invokeLLMVision` → unsorted note (no new OCR vendor).
- `createNote` accepts optional `source` so imports stay `import` / user captures stay `user`.

**Verified:** typecheck green; focused backlog tests 9/9 (inbox capture, PDF rejection, research JSON parse, admin).

**Raw findings:**
- Research is inert until `TAVILY_API_KEY` is set — intentional.
- Disk on this workstation remains ~1 GB free; avoided heavy OCR/PDF live API tests here.
- Candice / GHL / Stripe / client-nodes still blocked on credentials or security review.

**Next:** Christian Phase 5 phone/ASK QA; optionally add Tavily + inbox secret on Railway.

### 2026-08-03 — Dead UI tree removed + production reindex API
**Changed:**
- Deleted unused root `src/` (15 files). Live UI is exclusively `client/src`; nothing imported the old tree.
- Extracted `reindexVaultFromDisk` and added PIN-gated `admin.reindex` requiring `{ confirm: "REINDEX" }` so production embeddings can be rebuilt without a local DB tunnel, without auto-running on boot.
- Updated START-HERE / whats-next for live Railway status and deferred Christian QA.

**Verified:** `npm run typecheck` green; admin + orphans tests 5/5 after hardening the quarantine probe (unique title, short body under enrich threshold). Full suite previously 94/95 with one brittle orphan list assertion under live enrich — fixed. Disk on this machine is critically low (~1 GB free); avoid large local reindex/embed runs here.

**Raw findings:** Christian confirmed live unlock works; ASK smoke + phone install still deferred by him. Orphan quarantine test failed when enrich/AI could change isolation assumptions — test no longer depends on `orphans.list` finding the probe first.

**Next:** Christian runs ASK + phone QA; optionally mount `/app/vault` if not already; optionally enable Git mirror.

### 2026-08-03 — Railway live; QA deferred
**Changed:** No code. Christian confirmed live Railway deploy unlocks with PIN and works. Deferred two finish checks to later: production ASK/citations smoke + phone Add-to-Home-Screen install/PIN.

**Next:** Remind Christian of those two QA items when he returns.

### 2026-07-30 — Backlog batch: dead-code removal, weekly digest, Git mirror
**Changed:**
- **Deleted the duplicate server stack** (`server/vault/*`, `server/routers/*`, `server/context.ts`, `server/trpc.ts`) plus the broken root `scripts/reindex.ts`, which imported a `connectDb` that no longer exists. Nothing live imported any of it — every `../vault/*` import inside `server/lib/` resolves to `server/lib/vault/`. This removes the divergent parser that accepted `[[Title#heading]]`, so agents can no longer follow the wrong contract.
- **Weekly digest (backlog D9)** — `server/lib/digest/weeklyDigest.ts`, deliberately LLM-free and deterministic: it reports the last 7 days of vault activity, War Room movement, strongest hubs, orphans, and unresolved wikilinks. Writes one note per period at `warroom/weekly-digest-YYYY-MM-DD.md`, overwriting on re-run rather than piling up drafts. Exposed as `digest.preview` (read-only) and `digest.write`, `npm run digest`, and a tap-based WEEKLY DIGEST button on the HUD.
- **Vault → private Git mirror (backlog B1)** — `server/lib/vault/gitMirror.ts`, off unless `VAULT_GIT_SYNC=1`, with `VAULT_GIT_DRY_RUN=1` to verify configuration before it touches the network. Hooked into the chokidar watcher on its own ~5-minute debounce, so bursts of edits collapse into one commit. Remote URLs are redacted in logs and error messages so a token in the URL cannot leak.

**Verified:** typecheck green; suite 93/93 (75 after the deletion removed 13 duplicate-stack tests, then +18 new digest and mirror tests). Ran `npm run digest` against the real vault → wrote a valid note (`19 notes · 0 errors · 0 warnings`) that links to real hubs, so the digest is not itself an orphan. Git mirror dry-run verified against a temporary repo: detected the change, logged a redacted remote, committed nothing.

**Raw findings:**
- One digest test assertion was wrong, not the code: `Stale` legitimately appears in the all-time hubs/orphans sections, so the weekly-window assertion now scopes to the "Touched this week" section.
- The mirror deliberately does no repo setup and invents no credentials. Turning it on is a one-time manual `git init` + remote step, documented in `.env.example`.
- Root `src/` (15 files) is also fully superseded by `client/src` but is outside `tsconfig`/`vitest` scope, so it causes no type or test confusion. Left for a separate decision.

**Next:** Railway cutover remains the only thing blocking Phase 5 sign-off.

### 2026-07-30 — Tech-debt batch: typecheck, CI, paths
**Changed:**
- `npx tsc --noEmit` is green for the first time (was 14 errors, violating the strict-TS rule). Fixes: exported a single `Database` type from `server/db/index.ts` (the two `mysql2` `Pool` types no longer clash), folder label/colour lookups now have explicit fallbacks under `noUncheckedIndexedAccess`, `GraphPane` hit-testing uses a `for…of` loop so control-flow analysis sees the assignment, `RadarPane` corner data is `as const` tuples, `FOLDERS` entries all carry `error`, and the dead `server/context.ts` import path was corrected.
- Added `npm run typecheck` and `.github/workflows/ci.yml` (typecheck → vault validation → tests → client build). DB/AI tests self-skip without secrets, so CI needs no keys.
- Added `server/lib/paths.ts` as the single source for `VAULT_DIR` / `VAULT_SEED_DIR` / `CLIENT_DIST_DIR` / `MIGRATIONS_DIR`, all env-overridable — the vault volume no longer has to be mounted at `/app/vault`.
- `CLIENT_ORIGIN` now accepts a comma-separated list, so a Railway URL and a custom domain can both hold cookies.
- Tightened `pinGuard` to exempt only `auth.*`; tRPC `health` (which reports note/embedding counts) is now behind the PIN, while Railway keeps probing the public Express `/health`.

**Verified:** `npx tsc --noEmit` exits 0; full suite 87/87 then 88/88 with a new pinGuard test asserting `health` and `vault.list` reject while locked and `auth.status` stays reachable.

**Raw findings:**
- `server/vault/*`, `server/routers/*`, `server/context.ts`, and `server/trpc.ts` are an unreachable duplicate of the live stack, and the duplicate parser accepts `[[Title#heading]]` while the live one does not. Left in place pending Christian's go-ahead to delete, since removing files also removes their tests.
- `embedVaultNotes` deletes and re-embeds the whole vault on every run, so a boot-time embedding hook would re-bill Voyage on each redeploy. A one-off `npm run reindex` stays the correct production path.

**Next:** Decide on deleting the duplicate server stack; then Railway cutover.

### 2026-07-30 — Phase 5 autonomous ship hardening
**Changed:**
- `/health` now reports boot readiness (`seeded`/`migrated`/`indexed`) and returns 503 until ready; SIGTERM/SIGINT close the watcher + MySQL pool; legacy unauthenticated `/assets/portrait` routes removed (tRPC + guarded `/vault-assets` only).
- PinGate refreshes session status on focus/reconnect; mobile safe-area padding applied to chat chrome.
- Added automatic Drizzle migrations on server boot and before `npm run reindex`; the baseline migration is safe against pre-existing derived tables.
- Made `tsx` a production dependency so the Docker runtime no longer installs packages at image build time outside `npm ci`.
- Added Railway `/health` checks and expanded health output with database/PIN configuration flags.
- Removed service-worker runtime caching of authenticated tRPC and vault responses, and delete the legacy `sa-api` cache on client startup.
- Protected legacy portrait/vault asset routes behind the PIN session when PIN protection is enabled.
- Hardened PIN auth: production requires `SESSION_SECRET`; five failed attempts trigger a 15-minute in-memory block.
- Added a visible mobile LOCK control that clears the session and returns to PinGate.
- Added raster 180/192/512 PNG PWA icons and wired the iOS touch icon + manifest.
- Added `AGENT-WRITE-CONTRACT.md`, `npm run validate:vault`, validation tests, and Railway/phone/agent setup instructions in `START-HERE.md`.

**Verified:**
- Existing migration applied successfully to the configured MySQL database (`MIGRATIONS_OK`).
- Vault validation: 18 notes, 0 errors, 0 unresolved-link warnings.
- Focused auth/health/validation tests: 17/17 pass.
- Full test suite: 87/87 pass.
- Production PWA build passes; generated manifest uses PNG icons and generated service worker has no tRPC/vault runtime routes.
- Server smoke: migrations applied, 18 notes / 41 links indexed, watcher started, and `/health` returned database/PIN configuration flags.
- IDE diagnostics and `git diff --check`: clean.

**Raw findings:**
- The previous service worker cached authenticated API/vault responses under `sa-api`; locking the UI did not guarantee cached data was removed.
- Raw `/vault-assets` and legacy `/assets/portrait` Express routes were outside the tRPC PIN middleware.
- Docker previously ran `npm install tsx` after `npm ci`, making runtime dependencies less deterministic.
- Docker is not installed on this Windows workstation, so the final image could not be built locally. The Vite production build and production dependency tree were verified instead.
- Live Railway variables, volume mounting, one-off production embedding, HTTPS smoke testing, and phone installation require Christian's Railway/phone access.

**Next:** Configure Railway variables + `/app/vault` volume, deploy, run one production reindex if embeddings are empty, then complete phone install/PIN smoke QA.

### 2026-07-22 — Phase 5 Task 4: Real vault import
**Changed:**
- Added `server/scripts/import-intel.ts` + `npm run import:intel` — repeatable seeder that copies Christian's curated `Desktop/Intelligence/` markdown into the vault with valid frontmatter (`source: import`) and cross-links.
- Imported 9 real knowledge files into `vault/resources/`: Pinnacle Soul File (v3.1), Marketing Playbook (Willington), Market Intelligence, Coach Methodologies, Coach Program Library, Competitor Pain Points, Injury Adaptation Research, Architecture Audit, GHL AI Automation. ~38k words total.
- Overwrote placeholder `pinnacle-soul-file.md` and `marketing-playbook.md` with the real content (titles kept, so existing inbound wikilinks stay intact).

**Verified:** Indexer parse over vault → **18 notes, 41 links, 0 unresolved wikilinks**; all frontmatter valid. Real Marketing Playbook is now the top graph hub (PL ~13,300), Market Intelligence next (~10,300).

**Embeddings (free-tier throttle):** First reindex hit Voyage `429` — free tier is 3 RPM / 10K TPM (no payment method). Added token-budgeted batching + `EMBED_FREE_TIER=1` mode (`server/lib/rag/retrieve.ts`) that caps each request well under 10K tokens and paces one/min. Re-ran `EMBED_FREE_TIER=1 npm run reindex` → 11 batches (~7.8k tokens each, zero 429s) → **18 notes, 345 chunks embedded**. Scouter RAG now runs on real content. Full suite 79/79 green (relaxed 3 brittle exact-vault-count tests to seed-subset assertions).

**Deploy:** Committed + pushed to `origin/main` → triggers Railway Dockerfile build.

**Vault seed-on-boot (fixes the empty-deploy trap):** The runtime image never copied `vault/` at all, and a Railway volume at `/app/vault` would shadow it anyway — so a deploy would boot with zero notes. Fixed: Dockerfile now bakes `vault/` → `vault-seed/`; `server/lib/vault/seed.ts` (`seedVaultIfEmpty`) copies seed → vault on boot **only when the live vault has no markdown**, so fresh deploys start with real notes and redeploys never clobber user edits. 3 unit tests; suite now 82/82.

⚠️ Manual Railway steps still required: set env vars (`DATABASE_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, optional `APP_PIN_HASH`/`SESSION_SECRET`). Then verify install + PIN on phone.

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
