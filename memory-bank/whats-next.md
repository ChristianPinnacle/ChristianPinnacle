# What's Next

## Current phase: PHASE 5 — Ship 🔨 IN PROGRESS

**Phase 4 review:** CREATE + DECIDE done. PDF + idea inbox deferred.

### Phase 5 task queue
1. ~~**PWA**~~ ✅ vite-plugin-pwa · manifest · SW · install icons
2. ~~**PIN lock**~~ ✅ `APP_PIN_HASH` + session cookie · PinGate · API guard
3. ~~**Railway deploy**~~ ✅ Dockerfile + railway.json · serves `dist/client` + vault volume
4. ~~**Real vault import**~~ ✅ `npm run import:intel` seeds 9 real knowledge files from `Desktop/Intelligence/` → `vault/resources/` (~38k words), cross-linked; reindexed

### How to enable PIN
```
npm run pin:hash -- 1234
```
Copy `APP_PIN_HASH` + `SESSION_SECRET` into `.env`, restart server.

### Definition of done for Phase 5
App installs on phone, PIN-gated, runs on Railway with persistent vault, real notes imported.

**Status (2026-07-30):** Code complete: import, seed-on-boot, migrations-on-boot, deterministic Docker runtime, raster PWA icons, LOCK UX, hardened PIN/assets/cache handling, agent contract, and vault validator. **Manual finish only:** set Railway variables, mount `/app/vault`, deploy, run one production reindex if embeddings are empty, then verify ASK + install + PIN/LOCK on a phone.

---

## Phase 4 — Modes + ingestion ✅ COMPLETE (core)

## Phase 3 — AI features ✅ COMPLETE

## Phase 2 — RAG chat ✅ COMPLETE

## Phase 1 — Vault + Graph ✅ COMPLETE

## Backlog
- Railway live cutover + phone QA (requires Christian's account/device)
- ~~Weekly digest~~ ✅ `npm run digest` / HUD WEEKLY DIGEST button → `warroom/weekly-digest-*.md`
- ~~Private GitHub vault mirror~~ ✅ built, off by default — needs a private repo + token to switch on (`VAULT_GIT_SYNC=1`, verify with `VAULT_GIT_DRY_RUN=1` first)
- Idea inbox, PDF import, Candice bridge, autonomous web research agent
- Voice capture, image OCR, KPI feeds, GHL/Stripe, client nodes, competitor watch
- Optional cleanup: delete root `src/` (15 files, fully superseded by `client/src`)
