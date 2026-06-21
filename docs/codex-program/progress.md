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
| `05-result-types` | `codex/05-result-types` | merged into `codex/integration` | `7672087` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `06-active-session` | `codex/06-active-session` | merged into `codex/integration` | `310b024` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `07-async-states` | `codex/07-async-states-rescue` | merged into `codex/integration` | `37b2c0e` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `08-mvp-hardening` | `codex/08-mvp-hardening` | merged into `codex/integration` | `eb00fc5` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `09-tests-ci` | `codex/09-tests-ci` | merged into `codex/integration` | `5b42e36` merge | `npm run check` passed; `npm run check:task-workflow` passed |
| `10-pre-backend-review` | `codex/10-pre-backend-review` | read-only review complete | no commit | `npm run check` passed; `npm run check:task-workflow` passed |

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

- Architecture lint now blocks app route JSON serialization, old workout-based session paths, and non-primitive router params.
- Backend/auth/provider decisions are external blockers.
- `.expo-export-check/` generated output policy is covered by Wave 8 regression tests and remains ignored after `npm run check`.

Blocked:

- Backend rollout is blocked by provider/API/auth decisions.
- Real auth is blocked by auth provider and token storage decisions.

Next:

- Start Wave 9 API boundary in a separate thread/worktree after preparing a narrow handoff.
- Keep auth shell, database contract, backend providers, and production hardening blocked until their later waves.
- Do not implement API/auth/backend work in the orchestrator chat.

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

## Wave 4

Status:
- implementation_reviewed
- merged

Branch:
- `codex/05-result-types`

Integration:
- Merged into `codex/integration` as `7672087`.

Completed:

- Added result type support for `weight_reps`, `reps`, `duration`, and `distance_duration`.
- Added optional duration and distance fields to workout sets, result upsert inputs, stored workout results, previous-performance records, and result summaries.
- Added session exercise snapshots for result type and preserved existing exercise-name snapshots through session/result reducer normalization.
- Added result snapshots for exercise name and result type so completed history can remain stable after exercise rename/archive.
- Made previous-performance lookup filter by result type when provided and return stored exercise/result snapshots.
- Made session summary and history calculations treat only `weight_reps` as volume while still counting valid reps, duration, and distance-duration sets as logged work.
- Updated session and summary screens to carry result type metadata through snapshots and format non-weight result labels.
- Added focused integration coverage for all four result types plus stable snapshots after exercise rename/archive.

Checks:

- `npm run typecheck`: passed on 2026-06-21.
- `npm run test:integration`: passed on 2026-06-21.
- `npm run check`: passed on 2026-06-21.
- `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: blocked on 2026-06-21 because this worktree is missing harness directories: `plans`, `plans/archive`, `plans/prds`, `plans/sprints`, `tasks/archive`, `tasks/contracts`, `tasks/reviews`, `tasks/notes`, `.ai/harness/checks`, `.ai/harness/failures`, `.ai/harness/worktrees`, and `.ai/harness/runs`.
- Independent read-only review initially found P1 runtime/editor blockers; fixes landed in `d2f9a3b`.
- Second independent read-only review passed with no merge blockers.
- Post-merge integration checks on `codex/integration`: `npm run check` passed; `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow` passed.

Remaining:

- No P0/P1 product risks known in Wave 4 scope.
- Repo-harness directory setup must be restored outside this wave before the strict task-workflow gate can pass in this worktree.

Review gate fixes:

- Fixed DataProvider session start/upsert so result type, exercise-name snapshot, duration, and distance fields are initialized and persisted in the production data path.
- Made the active-session Approach editor render metric inputs for `weight_reps`, `reps`, `duration`, and `distance_duration`, and emit matching result fields.
- Updated unfinished-set guard to include duration/distance metrics.
- Updated persistence validation for result-type workout/session/result fields and `duration`/`distance` quick values.
- Added focused integration coverage for the pure result builders used by DataProvider plus persistence round-trip coverage for duration/distance quick values.

Review gate fix checks:

- `npm run typecheck`: passed on 2026-06-21.
- `npm run test:integration`: passed on 2026-06-21.
- `npm run check`: passed on 2026-06-21.
- `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: still blocked on 2026-06-21 because this worktree is missing required harness directories.

## Wave 5

Status:
- implementation_reviewed
- merged

Branch:
- `codex/06-active-session`

Integration:
- Merged into `codex/integration` as `310b024`.

Completed:

- Added `ActiveSessionConflictError` and typed conflict detection.
- Added owner-wide active-session selectors plus workout-specific active-session helpers.
- Made starting the same workout return the existing active session instead of creating a duplicate.
- Made starting a different workout while another owner session is active throw a typed conflict.
- Updated home and workout flows to route users into the already active session when a conflict is returned.
- Preserved idempotent completed-session behavior after the result-type wave.
- Added integration coverage for active-session selectors, same-workout idempotency, different-workout conflict handling, and completed-session cleanup.

Checks:

- `npm run test:integration`: passed on 2026-06-21.
- `npm run check`: passed on 2026-06-21 in the Wave 5 worktree.
- `npm run check`: passed on 2026-06-21 after merge on `codex/integration`.
- `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed on 2026-06-21 after restoring tracked workflow directories and refreshing the handoff resume packet.

Review gate:

- Independent subagent review was unavailable because the session hit the active thread limit.
- Fallback local read-only review checked `codex/integration..codex/06-active-session` and found no merge blockers.

Remaining:

- No P0/P1 product risks known in Wave 5 scope after Wave 6 merge.

## Wave 6

Status:
- implementation_reviewed
- merged

Branch:
- `codex/07-async-states-rescue`

Integration:
- Merged into `codex/integration` as `37b2c0e`.

Completed:

- Added typed `DataError`, retryable query-state helpers, and a single-flight mutation guard.
- Exposed hydration error/retry through `DataProvider` without changing persistence schema or migrations.
- Replaced fake always-ready data hook states with hydration-aware `isLoading`, `error`, retry/refetch, and guarded `notFound`.
- Added guarded mutations and visible loading/error states to client create/detail/history flows.
- Added guarded submit/loading/error states to workout draft, schedule, workout detail, and active session finish flows.
- Preserved Wave 4 result-type behavior and Wave 5 owner-wide active-session conflict routing.
- Added focused integration coverage for query-state and mutation-guard primitives.

Checks:

- `npm run check`: passed on 2026-06-21 in the rescue worktree.
- `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: blocked in the rescue worktree because `.ai/harness/runs`, `.ai/harness/checks`, `.ai/harness/failures`, and `.ai/harness/worktrees` were absent there.
- Fallback local read-only review checked `codex/integration..codex/07-async-states-rescue` and found no merge blockers. Independent subagent review was not run because this turn did not have explicit sub-agent authorization.
- Post-merge `npm run check`: passed on 2026-06-21 on `codex/integration`.
- Post-merge `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed on 2026-06-21 on `codex/integration`.

Remaining:

- P1 follow-up: `app/(tabs)/index.tsx` home start/create actions still need the same async mutation guard treatment.
- P1 follow-up: `app/sessions/[sessionId]/summary.tsx` should be reviewed for async loading/error handling, even though it has no explicit submit action.

## Wave 7

Status:
- implementation_reviewed
- merged

Branch:
- `codex/08-mvp-hardening`

Integration:
- Merged into `codex/integration` as `eb00fc5`.

Completed:

- Added latest-draft selector and hook so home/planning can resume an existing draft instead of silently creating another one.
- Added explicit planning-sheet controls to resume or delete the latest draft.
- Hardened draft creation/update/publish paths with UTC ISO normalization, timezone validation, available-exercise validation, and atomic publish/apply validation before state commits.
- Added custom exercise update support plus shared duplicate-name validation for active exercises, scoped by owner and normalized by trimmed/case-folded name.
- Added custom exercise edit/archive UI using existing workout exercise surfaces.
- Hid or disabled unfinished settings controls instead of keeping non-persistent toggles.
- Added optional session `startedTimezone` and `completedTimezone` metadata while keeping schema version `2` compatible with older snapshots.
- Added home start/create mutation guards with compact error feedback.
- Added session summary loading, error, retry, and true not-found states.
- Added focused integration coverage for latest draft selection, duplicate exercise validation, archived exercise visibility, and timezone persistence compatibility.

Checks:

- Wave worktree `npm run check`: passed on 2026-06-21.
- Wave worktree `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: blocked because `.ai/harness/runs`, `.ai/harness/checks`, `.ai/harness/failures`, and `.ai/harness/worktrees` were absent in that worktree.
- Orchestrator review found a P1 merge blocker: archived custom exercises were still visible through `useExercises()` and could still be added to active sessions by id.
- Follow-up fix `a2215c9` hid archived exercises from selectable flows, rejected archived session-add ids, and added focused regression coverage.
- Post-fix worktree `npm run check`: passed on 2026-06-21.
- Post-merge `npm run check`: passed on 2026-06-21 on `codex/integration`.
- Post-merge `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed on 2026-06-21 on `codex/integration`.

Remaining:

- Wave 8 should harden CI/test surfaces and generated-output policy, including `.expo-export-check/`.

## Wave 8

Status:
- implementation_reviewed
- merged

Branch:
- `codex/09-tests-ci`

Integration:
- Merged into `codex/integration` as `5b42e36`.

Completed:

- Added a generated-output policy regression test that verifies `build:check` exports to `.expo-export-check`, clears stale output, and that git ignores the export directory.
- Added the generated-output policy test to `test:unit`, so `npm run check` catches policy drift before the export step.
- Extended architecture-lint regression coverage to include unsafe params passed through `router.replace` and `router.dismissTo`, matching the existing lint surface.
- Confirmed no tracked CI workflow config exists in this repository; the aggregate local gate remains `npm run check`.
- Confirmed `.expo-export-check/` is ignored after `npm run check` and does not leave untracked output.

Checks:

- Baseline `npm run check`: passed on 2026-06-21 after installing dependencies in this worktree with `npm ci`.
- `npm run test:unit`: passed on 2026-06-21 with generated-output and router-method regression coverage.
- Final `npm run check`: passed on 2026-06-21.
- Initial `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: blocked because `.ai/harness/runs`, `.ai/harness/checks`, `.ai/harness/failures`, and `.ai/harness/worktrees` were absent in this worktree.
- After recreating those empty local harness runtime directories, `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed on 2026-06-21.
- Post-merge `npm run check`: passed on 2026-06-21 on `codex/integration`.
- Post-merge `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed on 2026-06-21 on `codex/integration`.

Remaining:

- No open Wave 8 P1/P2 items known.

## Pre-Backend Review Gate

Status:
- reviewed
- clear_to_start_wave_9

Branch:
- `codex/10-pre-backend-review`

Completed:

- Ran a separate read-only review thread after Waves 1-8 were merged.
- Confirmed no P0/P1 blockers before Wave 9 API boundary work.
- Confirmed owner scope, persistence v2, session routing, result types, active-session invariant, async states, MVP hardening, and tests/CI are ready for API-boundary work.
- Confirmed no API/auth/backend/token-storage surface has been started.
- Confirmed no product-code or docs edits were made by the review thread.

Checks:

- `npm run check`: passed on 2026-06-21 in the review worktree after installing dependencies with `npm ci`.
- Initial `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: blocked because empty local repo-harness runtime directories were absent in the worktree.
- After recreating `.ai/harness/runs`, `.ai/harness/checks`, `.ai/harness/failures`, and `.ai/harness/worktrees`, `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed on 2026-06-21.

Recommendation:

- Wave 9 `codex/11-api-boundary` may start.
- Keep Wave 9 limited to DTO/repository boundaries, typed errors, adapters/contracts, and contract tests.
- Keep auth shell, database contract, backend providers, and production hardening in later waves.
