<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

BizLens is a self-contained Next.js 16 (App Router, Turbopack) app. There is no database, no external service, and no required environment variables — analysis runs entirely in the `/api/analyze` route and `src/lib/`.

- Package manager is npm (`package-lock.json`). Dependencies are refreshed automatically by the startup update script (`npm install`).
- Run the dev server with `npm run dev` (serves on `http://localhost:3000`). Standard scripts live in `package.json`: `dev`, `build`, `start`, `lint`.
- There is no automated test suite; validate changes via `npm run lint`, `npm run build`, and manual testing against the UI or the `POST /api/analyze` endpoint (JSON body: `{"input": "...", "type": "auto|url|social|app|business"}`).
- `npm run lint` currently reports several pre-existing `no-unused-vars` warnings (0 errors); these are not from your changes.
