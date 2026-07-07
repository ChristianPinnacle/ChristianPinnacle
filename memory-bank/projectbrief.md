# Project Brief — Saiyan Archive

## What
Single-user AI second brain. Obsidian-compatible markdown vault + interactive graph UI (Vegeta/DBZ theme) + RAG chat over everything Christian knows. Installable PWA with PIN lock.

## Why
- Christian runs 4 businesses (VitalEdge Hub, Pinnacle Coaching, Adonis Gym, supplements). Knowledge is scattered across memory-bank files, Excel workbooks, chat histories, and agents' outputs.
- Agents (Claude Code, Manus, Candice) currently have disconnected memory. The vault becomes their shared brain: they write findings in, Christian queries them out.
- Obsidian compatibility = zero lock-in. The vault is plain .md files; Obsidian can open it directly.

## Users
One: Christian. No auth system beyond PIN lock. No multi-tenant. Ever (for this repo).

## Feature phases
### Phase 1 — Vault + Graph (current)
- Vault reader: parse `.md` files, frontmatter, `[[wikilinks]]`
- File watcher: re-index on change (chokidar)
- Graph API: nodes + edges payload
- Canvas graph UI ported from mock `brain-v6-full.jsx` (in `design/`): zoom/pan, folder toggles, flame aura, scouter reticle, PL counter, OVER 9000 slam
- Sidebar: folders, battle log (agent write events), vault sync status
- Note CRUD in-app (writes .md to vault)

### Phase 2 — RAG chat (Scouter)
- Chunk + embed on save (store in MySQL)
- ASK mode: retrieve → Claude → answer with citation chips → ignite source nodes
- "Ask about this" node-scoped chat

### Phase 3 — AI features
- Auto-linking: on save, propose semantic links (dashed edges, confidence, accept/reject)
- PL scoring: PL = f(inbound links, word count, recency) — real, not random
- Auto-tag + one-line summary on import
- Orphan detection → SCOUTER ERROR folder

### Phase 4 — Modes + ingestion
- CREATE mode: content generation grounded in Pinnacle Soul File + frameworks
- DECIDE mode: War Room folder search (decision log)
- PDF import (text extraction → note)
- Idea inbox: quick capture endpoint

### Phase 5 — Ship
- PWA manifest, service worker, PIN lock (Candice pattern)
- Railway deploy config
- Import Christian's real memory-bank/, market-intelligence.md, competitor files as seed vault

## Backlog (do not build yet)
Voice capture, image OCR, KPI workbook ingestion, GHL/Stripe feeds, client-per-node coaching brain (needs security review — health data), competitor watch cron, weekly digest.

## Design reference
`design/brain-v10-hud.jsx` is the approved visual mock (HUD card layout + graph toggle). Include a tap-to-upload portrait slot (stores image in vault as `assets/portrait.png`); never ship bundled character art. Theme tokens: BG `#070A18`, suit blue `#3C58D6`, pad gold `#F5C542`, armour white `#EDF1FA`, scouter red `#FF4D4D`, war room `#9AAFFF`. Fonts: Bungee (display), Saira Condensed (body).
