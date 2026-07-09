# What's Next

## Current phase: PHASE 1 — Vault + Graph ✅ COMPLETE

**Awaiting Phase 1 review** (see START-HERE.md step 6) before starting Phase 2.

### Task queue (Phase 1 — all done)
1. ~~**Scaffold**~~ ✅ Done
2. ~~**Vault engine**~~ ✅ Done
3. ~~**Graph API + UI**~~ ✅ Done 2026-07-08
4. ~~**HUD screen**~~ ✅ Done 2026-07-08
5. ~~**Note CRUD**~~ ✅ Done 2026-07-08

### Definition of done for Phase 1 ✅
Christian can open the app on his phone, see his notes as the HUD + graph, tap a note to read it, create a note, upload his portrait. No AI yet.

---

## Phase 2 — RAG chat (Scouter) — DO NOT START until Phase 1 review

Planned tasks (to be broken down after review):
1. **Embeddings pipeline** — chunk + embed on save/reindex, store in MySQL
2. **invokeLLM** — wire Anthropic wrapper (currently stub)
3. **ASK mode UI** — retrieve → Claude → answer with citation chips → ignite source nodes on graph
4. **Node-scoped chat** — "Ask about this" from selected graph node

Requires: `DATABASE_URL`, `ANTHROPIC_API_KEY`

## Phase 3: auto-linking + real PL + summaries. Phase 4: CREATE/DECIDE modes + PDF import. Phase 5: PWA + PIN + Railway deploy + real vault import.

## Backlog
Voice capture, image OCR, KPI feeds, GHL/Stripe ingestion, client nodes (security review first), competitor watch, weekly digest.
