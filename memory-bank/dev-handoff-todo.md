# Developer Handoff — Remaining TODO (Saiyan Archive)

**Audience:** Dev taking over unfinished work  
**Owner / product:** Christian (single user, non-technical — tap-based UX only)  
**Repo:** `saiyan-archive` (pushed to `origin/main`)  
**Source of truth for plans:** `memory-bank/` (`whats-next.md`, `whats-built.md`, `projectbrief.md`, `techstack.md`, `rules.md`)  
**Last updated:** 2026-08-03

---

## 0. Context (what is already done — do not rebuild)

| Phase | Status |
|-------|--------|
| 1 Vault + Graph + HUD + Note CRUD | ✅ |
| 2 Scouter ASK (RAG + citations + node-scoped) | ✅ |
| 3 Auto-link, PL, enrich tags/summary, orphans | ✅ |
| 4 CREATE + DECIDE | ✅ (PDF + idea inbox deferred) |
| 5 PWA, PIN, Railway live, real intel import, seed-on-boot | ✅ live (ASK smoke + phone install still Christian QA) |

**Not done = Christian's deferred QA + product backlog below.**

### Autonomous hardening completed 2026-07-30 → 2026-08-03
- ✅ Agent write contract + `npm run validate:vault`
- ✅ Raster iOS/manifest PNG icons + LOCK UX
- ✅ Drizzle migrations on boot/reindex
- ✅ Health checks, path centralization, CI/typecheck
- ✅ PIN hardening, asset/PIN gating, no auth SW cache
- ✅ Weekly digest + vault Git mirror (off by default)
- ✅ Deleted duplicate server stack + unused root `src/`
- ✅ PIN-gated `admin.reindex` with confirm `REINDEX`

### Non-negotiable rules (from `rules.md`)
1. `vault/` is source of truth. MySQL holds **derived only**. Wipe DB → `npm run reindex`.
2. Never write vault `.md` without valid frontmatter.
3. All LLM calls through `server/lib/invokeLLM.ts`.
4. TypeScript strict, zero `any`, Vitest for every tRPC procedure.
5. Mobile-first (412px). No bundled character art.
6. Simple > clever. Christian touches only taps.

---

## PRIORITY A — Finish Phase 5

### A1. Railway deploy ✅ LIVE
Christian confirmed unlock works (2026-08-03).

### A2. Phone install + PIN verification — DEFERRED
Remind Christian later.

### A3. Production reindex — READY IF NEEDED
`EMBED_FREE_TIER=1 npm run reindex` on Railway, or unlocked `admin.reindex({ confirm: "REINDEX" })`.

Also confirm SaiyanArchive has a volume at `/app/vault` (not only MySQL).

---

## PRIORITY B — Built, waiting on credentials
- Vault Git mirror: enable with `VAULT_GIT_SYNC=1` after private repo + dry-run

---

## PRIORITY C — Deferred Phase 4
- PDF import
- Idea inbox (UI and/or agent HTTP endpoint)

---

## PRIORITY D — Product backlog
- Candice live bridge (needs Candice API/credentials)
- Autonomous web research agent (approve-before-write)
- Voice, OCR, KPI, GHL/Stripe, competitor watch
- Client-per-node coaching brain (**blocked:** security review)
- Weekly digest ✅ already shipped

---

## Suggested next session
1. Christian ASK smoke + phone install
2. Confirm `/app/vault` volume
3. Christian picks: PDF, research agent, or Candice
4. Do **not** start client-per-node without security review

---

## Open questions for Christian
1. ASK on live site returning citations?
2. Phone install OK?
3. Next feature after QA: PDF, research agent, or Candice?
4. Private GitHub repo for vault mirror?
5. What is Candice technically?
