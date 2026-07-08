# What's Next

## Current phase: PHASE 1 — Vault + Graph

### Task queue (do in order, one per session)
1. ~~**Scaffold**: Vite React app + tRPC/Express server + Drizzle/MySQL config + vault/ dir with 5 sample notes (correct frontmatter, some [[wikilinks]]). npm run dev boots both. Commit.~~ ✅ Done
2. ~~**Vault engine**: reader (frontmatter + wikilink parse), chokidar watcher, notes_index + links tables, `npm run reindex`. Tests: parse, link extraction, rebuild-from-vault.~~ ✅ Done
3. **Graph API + UI**: `graph.get` tRPC procedure → nodes/edges. Port canvas renderer from design/brain-v10-hud.jsx GraphPane (zoom/pan/tap, flame aura, folder colors). Mobile 412px verified.
4. **HUD screen**: port v10 card layout (header, portrait slot with tap-to-upload → vault/assets/portrait.png, POWER LEVEL SCAN wired to real PL scores, energy reading, radar showing real hub positions, folder cards with live counts, battle log reading vault files where source != user).
5. **Note CRUD**: create/edit/delete via UI writes .md to vault; folder picker; markdown editor (textarea + preview is fine).

### Definition of done for Phase 1
Christian can open the app on his phone, see his notes as the HUD + graph, tap a note to read it, create a note, upload his portrait. No AI yet.

## Phase 2 (do not start): RAG chat. Phase 3: auto-linking + real PL + summaries. Phase 4: CREATE/DECIDE modes + PDF import. Phase 5: PWA + PIN + Railway deploy + real vault import.

## Backlog
Voice capture, image OCR, KPI feeds, GHL/Stripe ingestion, client nodes (security review first), competitor watch, weekly digest.
