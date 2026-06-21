# Progress

## Wave 0

Status:
- gate_0_ready

Threads:

| Thread | Branch | Status | Commit | Checks |
| --- | --- | --- | --- | --- |
| `00-orchestrator` | `codex/integration` | active in current workspace | `2e31559` baseline | `npm run check` passed |
| `01-baseline-decisions` | `codex/integration` | documented, no product-code edits | `2e31559` baseline | `npm run check` passed |
| `02-owner-scope` | `codex/02-owner-scope` | merged into `codex/integration` | `9070b48` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `03-persistence-v2` | `codex/03-persistence-v2` | merged into `codex/integration` | `9cc3ff2` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `04-session-routing` | `codex/04-session-routing` | merged into `codex/integration` | `d438d20` merge | `npm run check` passed; `npm run check:task-workflow` passed |

Completed:

- Read project instructions from `AGENTS.md`, `docs/codex/00-start-here.md`, and `DESIGN.md`.
- Read design-system rules from `docs/design-system/rules.md`, `figma-token-map.md`, `figma-to-code-map.md`, and `component-registry.json`.
- Confirmed package scripts and dependency baseline.
- Confirmed current integration branch is `codex/integration`.
- Designated the current Codex session as `00-orchestrator`.
- Reconfirmed audit findings directly against source files rather than relying on the GPT-generated handoff alone.
- Ran baseline checks:
  - `npm run check`: passed.
  - Sub-checks passed: lint, typecheck, design audit, unit tests, integration tests, web export.

Open findings:

- Async loading/error contracts are placeholders: app hooks return `isLoading: false` and `error: null`.
- Result model is still weight/repetitions-oriented; quick values are `weight | reps`.
- Architecture lint now blocks app route JSON serialization, old workout-based session paths, and non-primitive router params.
- Backend/auth/provider decisions are external blockers.
- `.expo-export-check/` generated output policy needs cleanup in tests/CI wave.

Blocked:

- Backend rollout is blocked by provider/API/auth decisions.
- Real auth is blocked by auth provider and token storage decisions.

Next:

- Orchestrate separate worktrees for Wave 4 result types, Wave 5 active-session invariant, and Wave 6 async states.
- Do not implement Wave 4+ in the orchestrator chat.

## Wave 1

Status:
- implementation_verified
- merged

Branch:
- `codex/02-owner-scope`

Integration:
- Merged into `codex/integration` as `9070b48`.

Completed:

- Added explicit `OwnerId` and `LOCAL_OWNER_ID` domain type.
- Added `ownerId` to client, exercise, workout, session, result, quick-value, and result-history domain entities.
- Scoped data hooks and local selectors by current owner.
- Added `currentOwnerId` to the data context.
- Scoped local repositories by owner for list, get, create, update, archive, session, result, history, and quick-value operations.
- Enforced same-owner relationships between clients, exercises, workouts, sessions, results, and quick values.
- Preserved legacy snapshot hydration by assigning missing owner IDs to `local-trainer`.
- Added mixed-owner selector integration coverage.
- Added legacy persistence coverage for v1 snapshots without `ownerId`.
- Ran independent read-only review for Wave 1; fixed the P1 legacy quick-value duplicate/stale-read issue it found.
- Hardened draft patch validation for nested exercise owner references.

Checks:

- `npm run check`: passed on 2026-06-20.
- `npm run check:task-workflow`: passed on 2026-06-20.
- Post-merge integration checks on `codex/integration`: `npm run check` passed; `npm run check:task-workflow` passed.
- Post-review targeted checks: `npm run typecheck` passed; `npm run test` passed.
- Post-review full checks: `npm run check` passed; `npm run check:task-workflow` passed.
- Post-merge integration checks on `codex/integration`: `npm run check` passed; `npm run check:task-workflow` passed.

Remaining:

- Wave 2 must formalize persistence v2 and owner-scoped storage keys; Wave 1 only keeps old schema data loadable.

## Wave 2

Status:
- implementation_reviewed
- merged

Branch:
- `codex/03-persistence-v2`

Integration:
- Merged into `codex/integration` as `9cc3ff2`.

Completed:

- Bumped persisted snapshot schema from `1` to `2`.
- Added typed v1 legacy snapshot shape and current v2 snapshot shape.
- Added v1-to-v2 migration that preserves entity IDs and assigns missing owner IDs to `local-trainer`.
- Made v2 validation require explicit `ownerId` and `meta`.
- Kept v1 validation compatible with legacy snapshots that lack owner IDs and meta.
- Added owner-scoped v2 storage key: `trainer-app:<ownerId>:data:v2`.
- Kept legacy v1 storage key as read fallback.
- Made AsyncStorage clear remove both current and legacy keys.
- Made hydration save the migrated/current snapshot only after successful load, preventing empty initial state from overwriting pre-hydration data.
- Added persistence tests for schema v2, v1 migration, ID preservation, owner defaults, strict v2 owner validation, and storage key shape.
- Ran independent read-only review for Wave 2; no P0/P1 findings were reported.

Checks:

- `npm run typecheck`: passed on 2026-06-20.
- `npm run test:unit`: passed on 2026-06-20.
- `npm run test:integration`: passed on 2026-06-20.
- `npm run design:audit`: passed on 2026-06-20.
- `npm run check`: passed on 2026-06-20.
- `npm run check:task-workflow`: passed on 2026-06-20.

Remaining:

- P2 follow-ups: add AsyncStorage adapter regression coverage, add provider-level delayed hydration coverage, and tighten `meta` referential validation before those pointers become operational.

## Wave 3

Status:
- implementation_reviewed
- merged

Branch:
- `codex/04-session-routing`

Integration:
- Merged into `codex/integration` as `d438d20`.

Completed:

- Moved active session screen from `app/workouts/[workoutId]/session.tsx` to `app/sessions/[sessionId]/index.tsx`.
- Moved summary screen from `app/workouts/[workoutId]/summary.tsx` to `app/sessions/[sessionId]/summary.tsx`.
- Removed `sessionId ?? workoutId` fallback semantics from session and summary screens.
- Updated navigation call sites to pass only `sessionId` for session and summary routes.
- Kept `/workouts/[workoutId]` and `/workouts/[workoutId]/reschedule` as workout-only routes.
- Extended architecture lint to ban app route JSON serialization and old workout-based session/summary paths.
- Extended architecture lint with AST checks for router params so callbacks, arrays, and domain objects cannot be passed through app route params.
- Added architecture-lint regression coverage for primitive params, domain-object params, inline callback params, shorthand callback params, indirect route-object callback params, and array params.
- Removed unused legacy JSON snapshot route-param helpers from `src/features/workouts/sessionResult.ts`.
- Added route-type generation before `tsc` so Expo Router typed paths reflect the current `app/` tree before typecheck.
- Ran independent read-only review for Wave 3; fixed the first P1 finding by adding primitive-only router-param AST enforcement.
- Ran post-fix independent read-only review; fixed the follow-up P1 shorthand/indirect route-object bypass in the router-param lint.
- Ran final follow-up independent read-only review; no P0/P1 findings remained and Wave 3 was cleared to merge after checks.

Checks:

- `npm run typecheck`: passed on 2026-06-21.
- `npm run lint`: passed on 2026-06-21.
- `npm run test`: passed on 2026-06-21.
- `npm run test:unit`: passed on 2026-06-21 with architecture-lint regression coverage.
- `npm run check`: passed on 2026-06-21.
- `npm run check:task-workflow`: passed on 2026-06-21.

Remaining:

- Post-merge checks on `codex/integration` passed.
