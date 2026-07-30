# Developer Handoff — Remaining TODO (Saiyan Archive)

**Audience:** Dev taking over unfinished work  
**Owner / product:** Christian (single user, non-technical — tap-based UX only)  
**Repo:** `saiyan-archive` (pushed to `origin/main`)  
**Source of truth for plans:** `memory-bank/` (`whats-next.md`, `whats-built.md`, `projectbrief.md`, `techstack.md`, `rules.md`)  
**Last updated:** 2026-07-27

---

## 0. Context (what is already done — do not rebuild)

| Phase | Status |
|-------|--------|
| 1 Vault + Graph + HUD + Note CRUD | ✅ |
| 2 Scouter ASK (RAG + citations + node-scoped) | ✅ |
| 3 Auto-link, PL, enrich tags/summary, orphans | ✅ |
| 4 CREATE + DECIDE | ✅ (PDF + idea inbox deferred) |
| 5 PWA, PIN code, Dockerfile/railway.json, real intel import, vault seed-on-boot | ✅ code done |

**Not done = live Railway cutover, phone QA, private Git mirror, and product
backlog features below.**

### Autonomous hardening completed 2026-07-30
- ✅ B2 agent write contract + `npm run validate:vault`
- ✅ B3 raster iOS/manifest PNG icons
- ✅ B4 LOCK control + tested `auth.lock`
- ✅ B5 Drizzle migrations run automatically on boot/reindex
- ✅ E4 health reports DB/PIN config; Railway health check configured
- ✅ E5 `START-HERE.md` contains Railway/PIN/phone instructions
- ✅ E6 portrait/vault asset routes require a valid PIN session
- ✅ PIN brute-force limit and required production `SESSION_SECRET`
- ✅ Authenticated API/vault service-worker caching removed
- ✅ E3 `CLIENT_ORIGIN` accepts a comma-separated origin list
- ✅ Strict typecheck green + `npm run typecheck` + GitHub Actions CI
- ✅ Centralised env-overridable paths (`server/lib/paths.ts`)
- ✅ Boot-state `/health` (503 until ready) + graceful SIGTERM shutdown
- ✅ tRPC `health` moved behind the PIN guard

- ✅ Deleted the unreachable duplicate stack (`server/vault/*`, `server/routers/*`,
  `server/context.ts`, `server/trpc.ts`, root `scripts/reindex.ts`)
- ✅ D9 weekly digest (`npm run digest`, `digest.preview` / `digest.write`, HUD button)
- ✅ B1 vault → private Git mirror (off by default, dry-run mode, watcher-debounced)

**Open decision:** delete root `src/` (15 files superseded by `client/src`).

### Non-negotiable rules (from `rules.md`)
1. `vault/` is source of truth. MySQL holds **derived only** (embeddings, AI links, PL). Wipe DB → rebuild with `npm run reindex`.
2. Never write vault `.md` without valid frontmatter (see `techstack.md`).
3. All LLM calls through `server/lib/invokeLLM.ts` — never Anthropic SDK from routers.
4. TypeScript strict, zero `any`, Vitest for every tRPC procedure.
5. Mobile-first (412px). No bundled character art.
6. Simple > clever. Christian touches only taps — no config UI.

### Local stack reminders
- `npm run dev` → API `:3001`, Vite `:5174`
- Env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, optional `APP_PIN_HASH` / `SESSION_SECRET` / `CLIENT_ORIGIN`
- PIN hash: `npm run pin:hash -- 1234`

---

## PRIORITY A — Finish Phase 5 (ship live)

### A1. Railway production env + first successful deploy
**Why:** Code and Dockerfile are on `main`, but the app is not usable on a phone until Railway has MySQL + AI keys + a running service. Without this, PWA/PIN are local-only.

**Steps**
1. Open Railway project linked to the GitHub repo / Dockerfile deploy.
2. Add a **MySQL** plugin (or external MySQL) → copy connection string into `DATABASE_URL`.
3. Set env vars on the service:
   - `DATABASE_URL` (Railway MySQL URL; URL-encode special chars in password)
   - `ANTHROPIC_API_KEY`
   - `VOYAGE_API_KEY`
   - `SESSION_SECRET` (long random)
   - `APP_PIN_HASH` (from `npm run pin:hash -- <pin>` locally)
   - `CLIENT_ORIGIN` = the public HTTPS URL of the same service (important for cookies/CORS)
   - `NODE_ENV=production`
   - Optional: `EMBED_FREE_TIER=1` if Voyage free-tier rate limits bite on first reindex
4. Mount a **Railway Volume** at `/app/vault` (persistence). Seed-on-boot (`seedVaultIfEmpty`) fills it **only if empty** from baked `vault-seed/`.
5. Deploy / wait for build from `main`.
6. Migrations now run automatically before startup indexing. Confirm the
   `[db] Migrations applied (schema ready).` log.
7. SSH/one-off or use health + logs: confirm `[vault] Initial index` / seed log, then trigger reindex if embeddings empty (script or temporary admin path — today reindex is `npm run reindex` locally; may need a deploy-time job).
8. Hit `/health` and public URL → PinGate → unlock → HUD/graph/ASK smoke test.

**Definition of done:** HTTPS URL loads, PIN works, notes visible, ASK returns grounded answer with citations.

**Risks / notes**
- Volume shadows empty dir → seed-on-boot should handle first boot; confirm logs.
- Cookies: `secure: true` in production — needs HTTPS.
- CORS: `CLIENT_ORIGIN` must match the browser origin exactly.

---

### A2. Phone install + PIN verification (manual QA)
**Why:** Phase 5 DoD is “installs on phone, PIN-gated.” Desktop PWA ≠ mobile install quirks (esp. iOS Safari + SVG icons).

**Steps**
1. Open Railway URL in mobile Chrome / Safari.
2. Add to Home Screen.
3. Cold-start from icon → PIN → unlock.
4. Test ASK / CREATE / DECIDE / open note / citation tap / graph ignite.
5. Lock (if UI lock exists) or clear site data → confirm re-prompt for PIN.
6. Log iOS icon issues (SVG apple-touch-icon may be weak — see B3).

**Definition of done:** Christian can use daily flow from phone icon without a developer.

---

### A3. Production reindex / embeddings on Railway
**Why:** Seeded notes exist on disk, but Scouter needs Voyage embeddings in MySQL. Local embed already done; prod DB starts empty.

**Steps**
1. Confirm tables `notes_index`, `links`, `embeddings` exist on Railway MySQL.
2. Provide a safe way to run `npm run reindex` in prod (one-off Railway service command, or boot hook if embeddings count = 0 — **prefer explicit one-off** to avoid surprise API spend).
3. Watch Voyage rate limits; use `EMBED_FREE_TIER=1` if needed.
4. Verify `health.embeddingCount` > 0 via tRPC/health.

**Definition of done:** Prod ASK works on real imported intel notes.

---

## PRIORITY B — Gaps implied by tech/docs but not built

### B1. Vault → private GitHub mirror (debounced commit)
**Why:** Spec’d in `techstack.md`: volume persists vault, but git mirror is the human/agent-readable backup and Obsidian sync path. Not implemented.

**Steps**
1. Design: on vault file change (extend chokidar watcher), debounce ~5 min, `git add/commit/push` to a **private** vault repo (or branch), using a deploy key / `GITHUB_TOKEN`.
2. Env: `VAULT_GIT_REMOTE`, `VAULT_GIT_TOKEN` (or SSH), enable flag `VAULT_GIT_SYNC=1`.
3. Never commit `.env` or secrets; vault-only paths.
4. Conflict strategy: server is writer; avoid two-way sync v1.
5. Tests: unit debounce + dry-run mode.
6. Document restore procedure for Christian.

**Definition of done:** Edit a note in UI → within ~5 min private repo shows commit.

---

### B2. Agent write contract + “how agents connect” docs ✅ COMPLETE
**Why:** Christian asked how to connect Claude Code / Manus / Candice. Architecture is **vault-as-API** (agents write `.md`), not HTTP. Without a written contract, agents write bad frontmatter and break the indexer.

**Steps**
1. Add `vault/resources/agent-write-rules.md` (or `docs/agent-contract.md`) with:
   - Allowed folders
   - Required frontmatter schema + `source` enum
   - Wikilink conventions
   - “After write, watcher reindexes; else `npm run reindex`”
2. Optional: tiny validation script agents can run.
3. Optional later: authenticated `POST /api/inbox` for remote agents (overlaps idea inbox — coordinate with C2).

**Definition of done:** Christian can paste one doc into each agent and get valid vault notes.

---

### B3. PWA icons — raster PNG for iOS ✅ CODE COMPLETE
**Why:** Current icons are SVG. iOS home-screen often wants PNG `apple-touch-icon`.

**Steps**
1. Export 180×180 / 192 / 512 PNG scouter icons (no copyrighted DBZ art — abstract scouter OK).
2. Wire in `client/index.html` + `vite-plugin-pwa` manifest.
3. Re-test Add to Home Screen on iPhone.

---

### B4. Lock button in UI / session expiry UX ✅ CODE COMPLETE
**Why:** `auth.lock` exists; may lack an obvious tap target for Christian to lock the scouter on a shared phone.

**Steps**
1. Add discreet LOCK control on HUD header.
2. Call `auth.lock` → clear cookie → PinGate.
3. Test at 412px.

---

### B5. Confirm / automate Drizzle migrate on deploy ✅ COMPLETE
**Why:** Fresh Railway MySQL has no tables unless migrate runs.

**Steps**
1. Audit whether boot runs migrations.
2. If not: add `drizzle-kit migrate` to Docker `CMD` wrapper or Railway release command.
3. Document in README / START-HERE Phase 5 section.

---

## PRIORITY C — Deferred Phase 4 (explicitly skipped/deferred)

### C1. PDF import
**Why:** Christian has PDF deliverables under Intelligence; Phase 4 deferred this. Unlocks importing research PDFs → vault notes without manual copy-paste.

**Steps**
1. Choose extractor (`pdf-parse` or similar) — text only v1 (no OCR).
2. UI: tap upload on SCROLL or note create → pick PDF.
3. Server: extract text → `createNote` into `unsorted` with `source: import`, title from filename, run `enrichNoteIfNeeded` + autolink.
4. tRPC `notes.importPdf` + tests (fixture PDF).
5. Mobile: file picker works; show progress; fail gracefully on scanned/image-only PDFs (“needs OCR — backlog”).

**Definition of done:** Upload a text PDF → note appears → ASK can cite it after reindex/embed.

---

### C2. Idea inbox (quick capture)
**Why:** Deferred because `＋` New Note overlaps. Still valuable if reduced to **one field + Enter** (faster than full editor) or as **HTTP endpoint for agents/phone shortcuts**.

**Steps (product choice first)**
1. Confirm with Christian: UI-only vs API-only vs both.
2. If UI: chat-bar adjacent “INBOX” mode or long-press `＋` → single textarea → save to `unsorted`.
3. If API: `POST /inbox` with shared secret header → write note → 201 `{ path }`.
4. Always valid frontmatter; optional enrich if body ≥ 40 chars.
5. Tests + 412px check.

**Definition of done:** Capture takes &lt;5 seconds and lands in Unsorted.

---

## PRIORITY D — Product backlog (do not start until A done unless Christian prioritizes)

### D1. Live Candice chat bridge
**Why:** Scouter only reads vault notes Candice wrote (`source: candice`). Christian wants optional **live** Candice. Needs Candice host URL + auth (unknown).

**Steps**
1. Discovery workshop: what is Candice today (API? another Cursor agent? custom server?)?
2. Design bridge: Saiyan → Candice API → optional write-back note `source: candice`.
3. New chat mode or settings (keep tap-simple).
4. Env keys; degrade if unset.
5. Security: PIN still gates UI; never expose Candice key to client.

**Blocked on:** Candice API docs/credentials.

---

### D2. Autonomous web research agent
**Why:** Christian asked for “search the internet from what it knows about my businesses and save notes into folders.” Out of Phase 5; high blast radius on vault SoT.

**Steps**
1. Product: **approve-before-write** v1 (show proposals; tap FILE) — do not silent-write.
2. Build context pack from vault (hubs: VitalEdge, Pinnacle, MFP, competitors).
3. Search provider (Tavily/Bing/Serp — pick one) + env key.
4. LLM summarizes → proposed notes with folder suggestion.
5. UI proposal panel (like LINK PROPOSALS / orphans).
6. Accept → `createNote` with `source: import` + enrich + embed.
7. Schedule optional cron later (competitor watch overlap).
8. Hard limits: max notes/run, domain allowlist, cost caps.

**Definition of done:** Christian taps “RESEARCH”, reviews 3 proposals, files one into `resources/`.

---

### D3. Voice capture
**Why:** Gym / driving capture. Candice already left voice-note style content manually.

**Steps**
1. Mobile mic → browser SpeechRecognition or upload audio → transcription API.
2. Land in Unsorted via inbox path.
3. Privacy review (audio leaving device).

---

### D4. Image OCR
**Why:** Bloodwork / whiteboard photos → text notes (VitalEdge adjacent).

**Steps**
1. OCR provider (Vision API / Tesseract).
2. Upload image → text note `unsorted`.
3. Security: health-adjacent images may need stricter handling (see D6).

---

### D5. KPI workbook ingestion
**Why:** Business numbers live in Excel; vault should get periodic snapshots.

**Steps**
1. Define which workbooks/sheets matter.
2. Parse xlsx → markdown summary notes under `areas/` or `resources/`.
3. Idempotent import by date.

---

### D6. GHL / Stripe ingestion
**Why:** CRM + payments as living context for Scouter.

**Steps**
1. OAuth/API keys; webhook vs poll.
2. Normalize to vault notes or derived DB tables (**prefer vault summaries** to keep SoT clear).
3. PII minimization.

---

### D7. Client-per-node coaching brain
**Why:** Per-client graphs. **Blocked:** security review — health data.

**Steps**
1. Security design review first (threat model, encryption, retention).
2. Only then schema + UI isolation.
3. Do **not** implement before written sign-off.

---

### D8. Competitor watch cron
**Why:** Overlaps D2 but narrower: scheduled scrape/summarize of known competitors.

**Steps**
1. Maintain competitor list note in vault.
2. Cron on Railway → research agent subset → proposals.
3. Link to existing competitor notes.

---

### D9. Weekly digest
**Why:** Christian gets one Scouter summary of new notes / decisions / orphans.

**Steps**
1. Job weekly: diff notes by `updated`, War Room changes, orphan count.
2. Deliver: vault note `warroom/weekly-digest-YYYY-MM-DD.md` and/or email later.
3. CREATE-mode voice optional.

---

## PRIORITY E — Polish / tech debt (from build findings)

| ID | Task | Why |
|----|------|-----|
| E1 | Voyage paid tier or keep `EMBED_FREE_TIER` documented for prod | Free tier 3 RPM caused reindex pain |
| E2 | Soften/fix any remaining brittle vault-count tests when seed grows | Import already relaxed some; keep suite green |
| E3 | `CLIENT_ORIGIN` dual-origin support if Vite preview ≠ API host in hybrid deploys | Cookie/CORS footguns |
| E4 | Health endpoint expose `embeddingCount` / pinConfigured for ops dashboards | Already partially there — document for Railway |
| E5 | Update `START-HERE.md` Phase 5 section with Railway + PIN steps | Christian-facing, non-technical |
| E6 | Ensure portrait upload works behind PIN + prod static paths | Easy to break with cookie/CORS |

---

## Suggested build order for the next dev

1. **A1 → A3 → A2** (go live + QA)  
2. **B5** (migrate on deploy) + **B2** (agent contract — unblocks Christian’s other AIs)  
3. **B1** (git vault mirror)  
4. **B3 / B4** (mobile polish)  
5. Then Christian picks: **C1 PDF**, **D2 research agent**, or **D1 Candice**  

Do **not** start D7 without security review.

---

## Quick reference — key files

| Area | Path |
|------|------|
| Phase plan | `memory-bank/whats-next.md` |
| Session history | `memory-bank/whats-built.md` |
| Auth / PIN | `server/lib/auth/pin.ts`, `client/src/components/PinGate.tsx` |
| RAG | `server/lib/rag/*` |
| Seed on boot | `server/lib/vault/seed.ts` |
| Intel import | `server/scripts/import-intel.ts` |
| Deploy | `Dockerfile`, `railway.json` |
| Router / API | `server/trpc/router.ts` |

---

## Open questions for Christian (dev should confirm before building)

1. Railway project already created? Domain / custom URL?
2. Voyage: stay free-tier pacing or add payment method?
3. Next feature after live: PDF, research agent, or Candice bridge?
4. Private GitHub repo name for vault mirror (B1)?
5. What is Candice technically (for D1)?
