# CLAUDE.md — Saiyan Archive

## Session start (mandatory)
Read all files in `memory-bank/` before doing anything:
1. `projectbrief.md` — what this is and why
2. `techstack.md` — stack, architecture, constraints
3. `whats-built.md` — current state (update after every session)
4. `whats-next.md` — current phase and task queue
5. `rules.md` — non-negotiable build rules

## Project one-liner
Personal AI second brain PWA. Markdown vault on disk is the source of truth; app renders an interactive DBZ-themed graph over it with RAG chat. Single user (Christian). Agents (Claude Code, Manus, Candice) read/write the vault directly.

## Core rules (duplicated from rules.md — do not violate)
- Vault (`vault/`) is source of truth. MySQL holds ONLY derived data (embeddings, AI links, PL scores). If DB is wiped, everything must be rebuildable from the vault.
- Never write to `vault/` without valid frontmatter (see techstack.md schema).
- All LLM calls through `server/lib/invokeLLM.ts` — never call the Anthropic SDK directly from routers.
- No feature work outside the current phase in `whats-next.md`. Log ideas to `memory-bank/whats-next.md § Backlog` instead.
- TypeScript strict. Zero `any`. Tests for every tRPC procedure.
- After every session: update `whats-built.md` with what changed, what's verified working, and any raw findings BEFORE marking tasks done.

## Commands
- `npm run dev` — starts backend (:3001) + frontend (:5174) concurrently
- `npm run test` — vitest
- `npm run reindex` — full vault re-scan → parse links → re-embed changed files
