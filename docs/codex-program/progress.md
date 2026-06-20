# Progress

## Wave 0

Status:
- gate_0_ready

Threads:

| Thread | Branch | Status | Commit | Checks |
| --- | --- | --- | --- | --- |
| `00-orchestrator` | `codex/integration` | active in current workspace | `2e31559` baseline | `npm run check` passed |
| `01-baseline-decisions` | `codex/integration` | documented, no product-code edits | `2e31559` baseline | `npm run check` passed |
| `02-owner-scope` | `codex/02-owner-scope` | implementation verified, not merged | pending | `npm run check` passed; `npm run check:task-workflow` passed |

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

- Owner scope missing from domain entities, selectors, repositories, persistence snapshots, and storage keys.
- Persistence v2 missing: `CURRENT_SCHEMA_VERSION` is `1`, unsupported versions throw, and there is no v1-to-v2 migration.
- Workout/session route semantics ambiguous: session and summary screens live under `app/workouts/[workoutId]` and fall back from `sessionId` to `workoutId`.
- Async loading/error contracts are placeholders: app hooks return `isLoading: false` and `error: null`.
- Result model is still weight/repetitions-oriented; quick values are `weight | reps`.
- Architecture lint blocks JSON params only under `app/workouts/*`; `src/features/workouts/sessionResult.ts` still contains legacy JSON snapshot helpers.
- Backend/auth/provider decisions are external blockers.
- `.expo-export-check/` generated output policy needs cleanup in tests/CI wave.

Blocked:

- Backend rollout is blocked by provider/API/auth decisions.
- Real auth is blocked by auth provider and token storage decisions.

Next:

- Review and merge Wave 1 owner scope into `codex/integration`.
- Do not begin Wave 2 persistence until Wave 1 owner scope is merged into `codex/integration`.

## Wave 1

Status:
- implementation_verified
- not_merged

Branch:
- `codex/02-owner-scope`

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
- Post-review targeted checks: `npm run typecheck` passed; `npm run test` passed.
- Post-review full checks: `npm run check` passed; `npm run check:task-workflow` passed.

Remaining:

- Merge `codex/02-owner-scope` into `codex/integration`.
- Wave 2 must formalize persistence v2 and owner-scoped storage keys; Wave 1 only keeps old schema data loadable.
