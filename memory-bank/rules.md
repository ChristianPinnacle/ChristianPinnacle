# Rules — non-negotiable

1. Vault is source of truth. DB is derived and rebuildable via `npm run reindex`. Test this explicitly.
2. Never write a vault file without valid frontmatter.
3. All LLM calls through `server/lib/invokeLLM.ts`. Never call SDK directly from routers.
4. TypeScript strict, zero `any`. Vitest test per tRPC procedure.
5. Stay inside the current phase (see whats-next.md). New ideas → Backlog, not code.
6. Update whats-built.md BEFORE claiming a task done. Log raw findings first, conclusions second.
7. Mobile-first: verify every screen at 412px width before marking complete.
8. Never bundle copyrighted character art. Portrait is user-uploaded only.
9. Simple > clever. Christian is non-technical; anything he touches must be tap-based with zero configuration.
