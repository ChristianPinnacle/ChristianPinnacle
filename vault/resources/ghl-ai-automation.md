---
title: GHL AI Automation
folder: resources
tags: [engineering, ghl, automation]
created: 2026-07-22
updated: 2026-07-22
source: import
summary: "Tooling notes on Claude-driven GoHighLevel workflow automation."
---
# GHL × Claude Automation — Tooling Notes
*Source: Lead Gen Jay (leadgenjet.com) YouTube, transcribed July 2026. Runs two 8-figure agencies; former top GHL paid partner. Tool originally built by "Dr. Blade." Condensed to what's actionable, with risk flags added — the flags are mine, not his.*

## 1. What the tool is

A free "GHL CLI" **Claude skill** (works in Claude Code / Cowork / Desktop) that lets Claude read, analyse, create, and edit entire GoHighLevel workflows — triggers, conditions, goals, fully formatted emails — from natural language. Demo: "pull the course sales sequence and open in notes" → Claude found the right workflow among 481 by fuzzy name, pulled an 88-step published workflow with all email copy, and rendered an editable summary.

**How it works (and why it's grey-hat):** GHL's public API + MCP server (~36 tools) cannot create or deep-read workflows. But every action in the GHL app fires an *internal* API call; the tool reverse-engineers those endpoints and replays them. Components:
- Python script wrapping the internal endpoints (Claude installs it from the repo)
- Claude skill that knows the 11 command groups
- Custom Chrome extension ("GHL token grabber") that harvests the Firebase refresh token from a logged-in session — one-time grab, reportedly valid for months
- Plus a standard private integration token (PIT-…) and the location ID (the segment after `/location/` in the app URL)

Distribution: gated repo behind an email opt-in at leadgenjet.com; email-copywriting companion skills on /skills.

## 2. Stated use cases
- **Audit/map a messy account:** know exactly how a lead flows from opt-in → nurture → booking → purchase, which emails fire where. (His account: 481 workflows, 286 published, years of agency hands in it.)
- **Mass updates:** new product / offer / calendar → tell Claude the change, it updates affected workflows.
- **Day-one builds:** abandoned cart, nurture, sales, onboarding sequences launched in a day — AI writes copy and installs it; the human keeps the strategy.

## 3. Email deliverability doctrine (independent of the tool — solid regardless)
- **Don't send broadcasts from GHL.** Shared IP reputation is poor (huge volume of new users sending bad email), dedicated IPs are worse ("way more likely to ruin these"), and GHL charges per email at volume. His 80k list never gets newsletters from GHL.
- **Split the stack:** GHL = CRM, workflows, sales pipeline, calendars. A dedicated ESP = anything deliverability-critical.
- **His ESP pick: Kit (ex-ConvertKit)** — full API (create/get/update sequences and emails), so the same Claude-drives-everything pattern works there; he built a `/kit` CLI. Verdict on alternatives: Brevo worst, Beehiiv poor, ActiveCampaign overpriced.
- **What lives in the ESP:** (a) nurture sequences for fresh opt-ins — highest spam-report risk, keep it off GHL's reputation; (b) re-engagement — 180 days of no opens/clicks → reactivation campaign, also high report-risk; (c) all broadcasts/newsletters.
- Baseline hygiene either way: dedicated sending subdomain, DNS configured, warmed, on GHL shared (not dedicated) IP for what remains in GHL.

## 4. Risk flags — read before installing ⚠️
- **ToS risk:** replaying internal API endpoints is likely against GHL's terms (the author jokes "please don't cancel my account" — that's a tell). Account suspension is a real possible outcome. Weigh against how load-bearing GHL is for the business.
- **Security risk:** the pattern is *install a third-party Chrome extension that exfiltrates your session token + run a private repo's Python script with a full-scope API key*. That is the exact shape of a credential-harvesting attack, even when benign. Mitigations if trialling: read the extension source and Python script first (they're small), use a **throwaway sub-account** not the production location, scope the PIT key minimally rather than "select all," and rotate tokens after testing.
- **Fragility:** internal endpoints are undocumented and can break or be blocked at any time. Nothing production-critical should depend on them.

## 5. Application — Christian
- **The speed-to-lead automation does NOT need this tool.** "Form started / checkout abandoned → notify within 5 min" is buildable with the official GHL workflow builder or public API — do it the supported way. This grey-hat skill is for bulk workflow *authoring/auditing*, not required for the one workflow that matters most.
- **Candice overlap:** Candice already holds a PIT key + location ID + calendar ID and uses supported endpoints. If Candice ever needs workflow-creation powers, this transcript proves it's technically possible via internal endpoints — but per §4, keep Candice on official APIs and treat this as a manual, sandboxed audit tool at most.
- **Real value today:** the *audit* use case. One sandboxed session mapping every existing Pinnacle/Adonis workflow into a document (like his 88-step pull) would give a full picture of what fires when — worth doing once, read-only, before any funnel rebuild.
- **Email split applies regardless:** if/when the Pinnacle list grows into the thousands, broadcasts and cold-ish nurture move off GHL to a dedicated ESP; GHL keeps CRM + booking + hot-lead workflows. Adopt the doctrine now so the list is never trained on a burned IP.

## Related
- [[VitalEdge Hub]]
- [[Architecture Audit]]
