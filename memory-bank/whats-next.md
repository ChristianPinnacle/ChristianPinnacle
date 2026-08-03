# What's Next

## Current phase: BACKLOG SPRINT 🔨 (Christian authorized 2026-08-03)

Phase 5 live. Backlog items that did not need product credentials are built.

### Shipped this sprint
1. ~~PDF import~~ ✅ tap **PDF** → unsorted note (`notes.importPdf`)
2. ~~Idea inbox~~ ✅ chat mode **INBOX** + optional `POST /inbox` (`INBOX_SECRET`)
3. ~~Research agent~~ ✅ **RESEARCH** mode, approve-before-write (`TAVILY_API_KEY` required to search)
4. ~~Voice capture~~ ✅ **MIC** → browser speech → INBOX draft
5. ~~Image OCR~~ ✅ tap **OCR** → Anthropic vision → unsorted note
6. ~~Daily research cron~~ ✅ auto-files hypertrophy / strength / injury rehab / endurance / lifting + War Room summary (`npm run research:daily` · HUD **DAILY RESEARCH**)

### Still left for Christian
1. ASK smoke test + phone install (Phase 5 QA)
2. Confirm `/app/vault` volume on SaiyanArchive
3. **Required for daily research:** set `TAVILY_API_KEY` on Railway; add cron `0 8 * * *` → `npm run research:daily`
4. Optional: `INBOX_SECRET`; vault Git mirror credentials

### Blocked / not built (needs you)
- Candice live bridge (API/docs unknown)
- KPI workbook / GHL / Stripe feeds (credentials + schema choices)
- Competitor watch cron (can reuse daily research with different topics later)
- Client-per-node coaching brain (**security review first**)

---

## Phase 5 — Ship ✅ LIVE (phone/ASK QA pending)

## Phase 4 — Modes + ingestion ✅ COMPLETE (core) · PDF/inbox now also ✅

## Phase 3–1 ✅ COMPLETE
