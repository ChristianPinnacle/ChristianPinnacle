# START HERE — Christian's Setup Guide

You do 6 things. Claude Code does everything else.

## One-time setup (10 minutes)

1. **Make the project folder.** Open Cursor → File → Open Folder → create a new folder called `saiyan-archive` (Documents is fine) → open it.

2. **Drop these files in.** Copy everything from this download into that folder, keeping the structure:
   - `CLAUDE.md` (in the root)
   - `memory-bank/` folder (all files)
   - `design/brain-v10-hud.jsx` (the approved mock — copy it in from your Claude downloads)

3. **Open the Claude Code terminal in Cursor** (same as your VitalEdge setup) and paste this exactly:

```
Read CLAUDE.md and every file in memory-bank/, then complete Task 1 from
whats-next.md (the scaffold). When finished: update whats-built.md, tell me
in plain non-technical language what you built and how I can see it working,
then stop. Do not start Task 2.
```

4. **Each new session after that**, paste:

```
Read CLAUDE.md and memory-bank/, then do the next task in whats-next.md.
When done: update whats-built.md, explain what you built in plain language,
show me how to test it myself, then stop.
```

5. **Test what it shows you** after each task. If something's broken, paste what you see back into Claude Code and say "this is broken, log raw findings then fix" — same rule you use with Manus.

6. **Repeat step 4** until Phase 1 is done (5 tasks). Then bring the whats-built.md file back to me (Claude) for a review before Phase 2.

## Your portrait (no code)
Once Task 4 is done, the app has a picture frame at the top — tap it, pick an image from your phone, done. Get the image by commissioning "original Saiyan-prince-inspired anime art" (Fiverr, ~$30–80) or generating one with an AI art tool. Save it to your phone first.

## When it's live (Phase 5)
The app is live on Railway (project **Saiyan Archive**). Daily use is: open the
URL or home-screen icon → enter PIN (`2541`) → explore, ask Scouter, add notes.

### Still do later (Christian QA)
1. Ask the vault a question — expect citations. If Scouter has nothing to
   retrieve, run a production reindex (below).
2. On your phone: Add to Home Screen → unlock with PIN → quick ASK / LOCK test.

### Production reindex (only if ASK is empty)
Preferred: Railway → SaiyanArchive service → open a one-off shell / run command:

```
EMBED_FREE_TIER=1 npm run reindex
```

There is also a PIN-gated API `admin.reindex` that requires `{ "confirm": "REINDEX" }`
so it cannot be triggered by accident. It rebuilds the whole embedding table —
do not spam it.

## Phase 5 — Railway setup (done for this project)

Already completed for Saiyan Archive:
- GitHub auto-deploy from `main`
- MySQL Online
- App Online with PIN, AI keys, and `CLIENT_ORIGIN`

If recreating from scratch:

1. Create/link a Railway service to this repository.
2. Add Railway MySQL and set `DATABASE_URL` on the app service.
3. Set `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, and
   `CLIENT_ORIGIN=https://<your-railway-domain>`.
4. Generate the PIN values locally:

   ```
   npm run pin:hash -- 1234
   ```

   Copy the printed `APP_PIN_HASH` and `SESSION_SECRET` into Railway variables.
   Never paste the plain PIN or keys into Git.
5. Set `NODE_ENV=production`. If Voyage is still on its free tier, also set
   `EMBED_FREE_TIER=1`.
6. Add a Railway Volume mounted at `/app/vault`. The first boot seeds this
   empty volume from the real vault baked into the image; later deploys do not
   overwrite edits.
7. Deploy. Startup applies Drizzle migrations before indexing the vault.
8. Run a one-off production reindex if embeddings are empty (see above).
9. Open `/health`, then the app URL. Unlock, ask a vault question, and tap a
   citation.

### Install on phone

1. Open the HTTPS Railway URL in Safari or Chrome.
2. Choose **Add to Home Screen** / **Install app**.
3. Launch from the icon and enter the PIN.
4. Test ASK, CREATE, DECIDE, opening a note, and the LOCK button.

### Weekly digest

On the HUD, tap **WEEKLY DIGEST**. It files one War Room note summarising the
week: what you touched, decisions that moved, your strongest hubs, and anything
orphaned. Re-tapping the same day refreshes that note instead of adding another.

### Vault backup to a private GitHub repo

This is built but switched off, because it needs a repo and a token you own:

1. Create a **private** GitHub repo for the vault.
2. Make the vault folder a git repo pointing at it (one-time setup).
3. Set `VAULT_GIT_SYNC=1`, `VAULT_GIT_REMOTE=...`, and `VAULT_GIT_DRY_RUN=1`.
4. Edit a note and check the logs: it reports what it *would* commit.
5. Remove `VAULT_GIT_DRY_RUN` to start pushing for real (about 5 minutes after
   your last edit).

### Connect other AI agents

Give each agent `AGENT-WRITE-CONTRACT.md`. Agents with filesystem access write
valid markdown to `vault/`; agents without filesystem access need a sync or a
future authenticated inbox endpoint. Agents never write directly to MySQL.

## If Claude Code gets stuck
Paste the error into a chat with me. I review, write the fix prompt, you paste it back. Same triangle as VitalEdge: I diagnose, the agent executes, you verify.
