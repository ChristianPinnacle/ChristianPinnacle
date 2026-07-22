---
title: Architecture Audit
folder: resources
tags: [engineering, vitaledge, audit]
created: 2026-07-22
updated: 2026-07-22
source: import
summary: "Senior-engineer architecture audit of the VitalEdge Hub codebase (June 2026)."
---
# Pinnacle Coaching — Senior Engineer Architecture Audit
**Date:** June 2026 · **Auditor:** Senior engineer (fresh eyes) · **Scope:** Full codebase — schema, server, client, shared, tests · **Method:** Static analysis, grep metrics, code reading
*Converted from PDF to markdown July 2026 for agent (Manus/Claude Code) consumption. Content unchanged; a Status column was added to §6 for execution tracking.*

## 1. Architecture Overview

Multi-tenant nutrition and blood-work coaching SaaS: **React 19 + tRPC 11 + Express 4 + Drizzle ORM + MySQL (TiDB)**. Five roles — `super_admin`, `admin`, `coach`, `client`, `individual` — one Node.js process on Cloud Run.

### 1.1 System map
```
Browser (React 19 + Tailwind 4)
 └── tRPC client (trpc.ts)
      └── /api/trpc → Express server (server/_core/index.ts)
           ├── tRPC router (server/routers.ts)      ← 4,950 lines, 174 procedures
           ├── Stripe webhook (server/stripeWebhook.ts)
           ├── Magic link auth (server/magicAuth.ts)
           ├── Email-password auth (server/emailPasswordAuth.ts)
           ├── Blood engine (server/bloodwork/)
           └── DB layer (server/db.ts)               ← 1,894 lines, ~120 exported functions
                └── Drizzle ORM → TiDB (MySQL-compatible)
```

### 1.2 Domain model (28 tables)
| Domain | Tables |
|---|---|
| Identity | users, workspaces, workspace_members |
| Client | client_profiles, consent_records, coach_client_relationships |
| Nutrition | ingredients, recipes, recipe_ingredients, meal_plans, day_types, meal_slots, slot_ingredient_overrides, slot_direct_ingredients, grocery_lists, saved_meals, saved_meal_recipes |
| Blood | biomarkers, blood_test_sessions, blood_test_results, supplement_recommendations |
| Supplements | supplements |
| Check-in | checkin_templates, checkin_template_questions, checkin_assignments, checkin_responses |
| Coaching | coach_notes, macro_targets, progress_entries, reminders |
| Auth/Admin | magic_links, otp_tokens, client_preview_tokens, coach_invite_tokens |
| Acquisition | signup_leads, coach_waitlist, education_content |

### 1.3 What works well
The bloodwork engine (`server/bloodwork/`) is genuinely well-structured — own `types.ts`, `formulas.ts`, `classification.ts`, `rules/`, `engine.ts`, `util.ts`, dedicated integration tests. The only part following a proper domain-module pattern. Macro calculation is correctly extracted into `shared/macros.ts` and shared server/client. tRPC middleware chain (`publicProcedure → protectedProcedure → coachProcedure`) is clean and composable. Schema is well-indexed for common query paths.

## 2. Critical Problem Areas

### 2.1 The God Router — `server/routers.ts` (4,950 lines, 174 procedures) — **CRITICAL**
Every procedure for every domain lives in one file. Past the threshold where anyone can hold context; merge conflicts during parallel dev will be catastrophic; TS must re-parse the whole file every save; the template README warns to keep router files under ~150 lines — this is 33× that.

**Recommended structure:**
```
server/routers/
  auth.ts            (~130)      blood.ts        (~540)
  admin.ts           (~460)      supplement.ts   (~230)
  workspace.ts       (~70)       billing.ts      (~60)
  clientProfile.ts   (~560)      individual.ts   (~360)
  mealPlan.ts        (~1,390 → further split)
  recipe.ts          (~30)       checkin.ts      (~330)
  notes.ts           (~80)       index.ts (assembles appRouter)
```

### 2.2 `await import()` anti-pattern — 35+ occurrences — **HIGH**
Dynamic imports inside procedure bodies (`const { getUserById } = await import("./db")` etc.). No runtime benefit (Node caches modules); almost certainly a workaround for circular-dependency pressure created by the God Router. Harder to read, refactor, tree-shake; slows the TS language server. **Root cause is 2.1** — splitting routers eliminates the need entirely.

### 2.3 Inline SQL in procedure bodies — ~40 occurrences — **HIGH**
`db.ts` exists to encapsulate queries, but ~40 procedures write raw Drizzle inline. `individualRouter` (lines 4331–4688) is the worst offender. Result: two data layers — one tested and reusable (`db.ts`), one not.

### 2.4 `currentClientCount` — denormalised counter with race condition — **HIGH**
Manual read-modify-write increment/decrement in procedure bodies. Two simultaneous adds lose an increment. Fix: atomic `UPDATE workspaces SET currentClientCount = currentClientCount + 1 WHERE id = ?` — or better, derive from `COUNT(*)` on `client_profiles` and delete the column.

### 2.5 Slot macro staleness — root cause of the custom-ingredients bug — **HIGH**
`meal_slots` stores calories/proteinG/carbsG/fatG as snapshots set at recipe-assignment time; never updated when a coach adds `slot_direct_ingredients`, applies `slot_ingredient_overrides`, or changes serving multiplier. The runtime recomputation fix in `getDaySlots` is correct but leaves stored columns permanently stale — any future direct read of `meal_slots.calories` silently returns wrong values. **Correct fix:** (a) never store computed macros, always compute at query time *(simpler, kills the whole bug class)*, or (b) update stored macros on every ingredient mutation.

### 2.6 `coachOrSelfManageProcedure` — DB hit on every protected request — **MEDIUM**
Every `client`-role call through this middleware (~30 procedures) fires a `SELECT` on `client_profiles` to check `accessMode`. Include `accessMode` in the JWT/session token instead.

### 2.7 Three unindexed FK columns — **MEDIUM**
Three `coachId: int("coachId")` columns with no index and no `.references()`. Full table scans on "get all clients for this coach"; orphaned rows accumulate silently on coach deletion.

### 2.8 Dual identity — `clientProfile.clientName` / `clientEmail` — **MEDIUM**
Denormalised copies of `users` data, with two lookup paths in ≥3 places. A client updating their email gets mail sent to the stale address. Remove the columns; join to `users`.

## 3. Performance Bottlenecks
- **3.1 `getDaySlots`:** bulk fetch is fine, but `Array.find()` inside `.map()` is O(n²). Negligible at 35 slots; measurable at 100+.
- **3.2 `generateGroceryList`:** synchronous `invokeLLM` (3–15s) inside a tRPC mutation blocks the server thread for all concurrent users. Move to a background job or stream.
- **3.3 `MealPlanBuilder.tsx` — 1,695 lines, single component:** every state update re-renders the tree; most likely source of mobile jank. Split into `MealPlanDayView`, `SlotItem`, `IngredientRow`, `SlotEditor` with local state.
- **3.4 `CoachClientDetail.tsx` — 1,443 lines:** same issue — profile, macro targets, check-in history, notes, bloodwork summary and plan assignment in one file; any change re-renders the page.

## 4. Scalability Risks
- **4.1 Single-file router can't be code-split** — whole module loads on every cold start.
- **4.2 Grocery list stored as JSON blob** in a text column — unqueryable, unindexable, full deserialise per read, concurrent updates rewrite the whole blob. Per-item status ("mark as purchased") would force a schema migration.
- **4.3 `checkin_responses` — 16 hardcoded metric columns** — adding a metric touches every layer. Use a JSON column or a `(responseId, metricKey, value)` table.
- **4.4 No request-level caching** — every `getDaySlots` / `mySlotIngredients` / `getClientsByCoach` hits the DB. Short-TTL in-memory cache (or Redis multi-instance) would cut load dramatically.

## 5. Maintainability Issues
- **5.1 Role checks as scattered string literals** (≥8 places). Centralise: `shared/roles.ts` with `COACH_ROLES`, `ADMIN_ROLES`, `isCoach()`, `isAdmin()`.
- **5.2 `as any` type assertions — 20+**, concentrated in `individualRouter` / `clientProfilesRouter`. Each suppresses a real schema/data mismatch — fix the mismatch, don't suppress.
- **5.3 `shared/types.ts` — 7 lines, nearly empty.** Shared shapes (computed MealSlot, ClientProfile display type) are duplicated or inlined in components.
- **5.4 No transactions on multi-step writes.** Client creation (users → client_profiles → workspace_members → email) and `hardDeleteWorkspace` (8-table cascade) can fail mid-way leaving partial state. Wrap in `db.transaction(async (tx) => { … })`.

## 6. Refactoring Strategy (priority order, none change functionality)

| # | Change | Impact | Effort | Risk | Status |
|---|---|---|---|---|---|
| 1 | Split `routers.ts` into `server/routers/<domain>.ts` | Kills dynamic imports, enables code-split, unblocks parallel dev | Medium | Low — pure file reorg | ☐ |
| 2 | Move `individualRouter` inline SQL to `db.ts` helpers | Closes the two-data-layer problem | Low | Low | ☐ |
| 3 | Atomic SQL increment (or derive) `currentClientCount` | Eliminates race condition | Low | Low | ☐ |
| 4 | Add `references()` + indexes to 3 `coachId` columns | Prevents orphans, faster queries | Low | Low | ☐ |
| 5 | Remove `clientName`/`clientEmail`, join to `users` | Kills stale-email bug class | Medium | Medium — migration + code | ☐ |
| 6 | Extract `shared/roles.ts` helpers | Role logic single source of truth | Low | Low | ☐ |
| 7 | Cache `accessMode` in session token | Removes per-request DB hit | Low | Medium — session schema change | ☐ |
| 8 | Remove stored macros from `meal_slots`, compute at query time | Eliminates staleness bug class | High | Medium — careful migration | ☐ |
| 9 | Wrap multi-step writes in `db.transaction()` | Prevents partial-write corruption | High | Low | ☐ |
| 10 | Split `MealPlanBuilder.tsx` / `CoachClientDetail.tsx` into sub-components | Kills mobile jank, improves DX | High | Medium | ☐ |

## 7. Production-Grade Code Examples

### 7.1 Router split
```ts
// After — server/routers/index.ts
import { authRouter } from "./auth";
import { adminRouter } from "./admin";
import { mealPlanRouter } from "./mealPlan";
// ... all imports at top, no dynamic imports

export const appRouter = router({
  auth: authRouter,
  admin: adminRouter,
  mealPlan: mealPlanRouter,
  // ...
});
```

### 7.2 Atomic counter
```ts
// Atomic:
await db.execute(sql`UPDATE workspaces SET currentClientCount = currentClientCount + 1 WHERE id = ${ws.id}`);

// Better — derive it:
const [{ count }] = await db
  .select({ count: sql<number>`COUNT(*)` })
  .from(clientProfiles)
  .where(eq(clientProfiles.workspaceId, ws.id));
```

### 7.3 Role helpers — `shared/roles.ts`
```ts
export const COACH_ROLES = ["super_admin", "admin", "coach"] as const;
export const ADMIN_ROLES = ["super_admin", "admin"] as const;

export function isCoach(role: string): boolean {
  return (COACH_ROLES as readonly string[]).includes(role);
}
export function isAdmin(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
```

### 7.4 Transaction wrapper
```ts
await db.transaction(async (tx) => {
  const [clientUser] = await tx.insert(users).values({ name, email, role: "client" });
  await tx.insert(clientProfiles).values({ userId: clientUser.insertId, workspaceId: ws.id });
  await tx.insert(workspaceMembers).values({ workspaceId: ws.id, userId: clientUser.insertId });
});
// Either all three rows exist, or none do
```

## 8. Summary

| Category | Finding | Severity |
|---|---|---|
| Architecture | God Router — 4,950-line single file, 174 procedures | **Critical** |
| Architecture | 35+ `await import()` anti-patterns in procedure bodies | High |
| Architecture | ~40 inline SQL queries bypassing `db.ts` | High |
| Data integrity | `currentClientCount` race condition | High |
| Data integrity | Stale slot macros in `meal_slots` (root cause of fixed bug) | High |
| Data integrity | No transaction wrappers on multi-step writes | High |
| Data integrity | 3 unindexed, unconstrained `coachId` FK columns | Medium |
| Data integrity | Dual identity — `clientName`/`clientEmail` duplicated from `users` | Medium |
| Performance | `coachOrSelfManageProcedure` DB hit per client request | Medium |
| Performance | `MealPlanBuilder.tsx` 1,695-line monolith → mobile jank | Medium |
| Performance | LLM call blocking request thread in `generateGroceryList` | Medium |
| Scalability | Grocery list as unqueryable JSON blob | Medium |
| Scalability | `checkin_responses` — 16 hardcoded metric columns | Low |
| Maintainability | Role checks as inline strings in 8+ places | Medium |
| Maintainability | 20+ `as any` suppressions | Medium |
| Maintainability | `shared/types.ts` — 7 lines, nearly empty | Low |

**Verdict:** functionally solid — well-designed domain model, properly modularised bloodwork engine, good stack. Problems are almost entirely **structural** (one file doing too much), not algorithmic. The single highest-leverage action is splitting `routers.ts` into domain sub-routers, which cascade-fixes the dynamic-import problem, makes the codebase navigable, and unblocks safe parallel development.

## Related
- [[VitalEdge Hub]]
- [[GHL AI Automation]]
