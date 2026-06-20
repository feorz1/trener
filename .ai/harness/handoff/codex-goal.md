---
title: "Codex Goal"
kind: "codex-goal"
created_at: "2026-06-20T17:56:03.818Z"
source: "repo-harness-mcp"
---
# Codex Goal: project readiness orchestration

## Source of truth

Repository: `/Users/gpbu7557/Documents/New project`.

Use the current repository state as the source of truth. Before implementation, read project instructions, `package.json`, TypeScript config, Expo Router routes, data contracts, `DataProvider`, reducers/selectors, persistence code, migrations, domain types, tests, and existing repo-harness workflow files.

Use the planner audit and the user-provided orchestration plan as input, but reconfirm all findings against the current code before making changes.

Core confirmed work areas:

1. Add owner/trainer scoping to user-owned entities.
2. Add safe persistence schema migration and owner-scoped storage.
3. Separate workout routes from session routes.
4. Enforce one active session per owner.
5. Expand exercise/result models beyond weight/reps.
6. Add real loading/error/retry/submitting states.
7. Harden critical MVP flows: clients, drafts, sessions, summary, custom exercises, settings decision, timezone.
8. Add regression tests and architecture checks.
9. Add API DTO boundary.
10. Add auth shell boundaries.
11. Document database contract.
12. Prepare production hardening baseline.

## Role

You are the main Codex orchestrator.

Create or designate `00-orchestrator`. Use child threads/subagents when supported. Do not implement the whole roadmap in one giant diff.

You own:

- roadmap;
- decisions;
- file ownership map;
- branch/worktree plan;
- subagent/task decomposition;
- review gates;
- integration checks;
- progress documentation;
- final report.

Use specialized subagents where available: explorer, domain-modeler, persistence-specialist, navigation-specialist, ui-state-specialist, test-engineer, api-architect, auth-security-reviewer, code-reviewer.

## Scope

Implement the work in waves.

Wave 0: Baseline and decisions.

- Record git status.
- Run existing checks.
- Reconfirm audit findings.
- Document decisions in `docs/codex-program/decisions.md`.
- Create `docs/codex-program/file-ownership.md`.
- Create/update `docs/codex-program/roadmap.md`.
- Do not start implementation until Gate 0 passes.

Wave 1: Owner scope.

- Add `OwnerId` and current-owner context/equivalent.
- Scope Client, Exercise, Workout, WorkoutDraft, WorkoutSession, WorkoutResult, QuickValue, and TrainerSettings if introduced.
- Repositories assign owner automatically.
- Selectors do not leak data across owners.
- Other-owner entities resolve as not found.

Wave 2: Persistence v2.

- Bump schema version.
- Add v1 to v2 migration.
- Preserve existing IDs and local data.
- Add safe defaults for new fields.
- Add owner-scoped storage key.
- Validate migrated snapshots.
- Prevent empty-state overwrite before hydration.

Wave 3: Session routing.

- Use `/workouts/[workoutId]` for workout details.
- Use `/sessions/[sessionId]` for active sessions.
- Use `/sessions/[sessionId]/summary` for summaries.
- Remove workoutId/sessionId fallback.
- Ensure route params contain only IDs and primitives.
- Extend architecture checks to block JSON/callback/domain-object route params.

Wave 4: Result types and session snapshots.

- Support result types: `weight_reps`, `reps`, `duration`, `distance_duration`.
- Add applicable fields to results.
- Store session snapshots for exercise name and result type.
- Keep history stable after exercise rename/archive.
- Ensure previous result and summary respect result type.

Wave 5: Active session invariant.

- Enforce one active session per owner.
- Repeated start for same workout returns existing session.
- Start with another active session returns typed conflict.
- Complete is idempotent.
- Double taps cannot create duplicates.

Wave 6: Async states.

- Replace fake always-ready hook states with real query/mutation state contracts.
- Add typed errors.
- Critical screens handle loading, empty, not found, error, retry, submitting, and disabled double-submit states.

Wave 7: MVP hardening.

- Drafts can be resumed, explicitly deleted, and published atomically.
- Client creation has submit guard and error handling.
- Custom exercises support create/edit/archive with duplicate-name validation.
- Settings either persist through a repository or are hidden/disabled.
- Timezone policy uses UTC ISO plus IANA timezone.

Wave 8: Tests and CI.

- Add unit and integration tests for owner isolation, persistence migration, client flows, draft flows, session flows, result flows, workout edit/reschedule/cancel, custom exercise lifecycle, navigation architecture, and unknown IDs.
- Ensure CI or aggregate local check runs typecheck, lint, architecture check, design audit, tests, and build/export check.

Gate: Pre-backend review.

- Run read-only review for data, persistence, navigation, auth/security, tests/build.
- Do not start API/backend work while P0 or data-loss P1 issues remain.

Wave 9: API boundary.

- Add API DTO boundary, mappers, typed errors, repository implementation boundaries, environment config, request cancellation, idempotency plan, and cache policy.
- If no real API exists, create contracts/tests/docs and record blocker only.

Wave 10: Auth shell.

- Add signed-out/signed-in route boundaries, route guards, current owner integration, secure credential boundary, logout cleanup, expired-session handling, and local-data migration choice.
- If provider is unknown, create contracts/development implementation and record blocker only.

Wave 11: Database contract.

- Document database model, API contract, and ownership rules under `docs/backend/`.
- Cover trainer/user, settings, client, exercise, workout, workout exercise, workout session, session exercise, and workout result.

Wave 12: Backend domain rollout.

- Only after pre-backend gate and API boundary.
- Roll out domains one at a time: clients, exercises, workouts/schedule, sessions, results/history.
- If API is unavailable, leave blockers and contracts.

Wave 13: Production hardening.

- Add or document baseline for security, privacy, monitoring, build config, performance, accessibility, and release readiness.

## Required workflow

Use real git workflow. Prefer `codex/integration` as integration branch and one implementation branch per wave.

Do not work directly on `main` or `master`.

Do not force push.

Do not delete user changes.

Do not commit secrets or generated build output.

Before parallel work, create a file ownership map. Only one active writer may own a file at a time.

Every implementation thread must follow:

1. Reconnaissance.
2. Plan.
3. Implementation.
4. Self-review.
5. Targeted tests.
6. Independent read-only review.
7. Fix all P0/P1 findings.
8. Handoff to orchestrator.

Maintain:

- `docs/codex-program/README.md`
- `docs/codex-program/roadmap.md`
- `docs/codex-program/progress.md`
- `docs/codex-program/decisions.md`
- `docs/codex-program/risks.md`
- `docs/codex-program/file-ownership.md`
- `docs/codex-program/external-blockers.md`
- `docs/codex-program/final-report.md`

## Required checks

Read `package.json` and use the real scripts available in this project.

Expected checks or equivalents:

- `npm run typecheck`
- `npm run lint`
- `npm run design:audit`
- `npm run test`
- `npm run build:check`
- aggregate `npm run check`, if present

Rules:

- no fake passing scripts;
- no suppressed exit codes;
- no `|| true` for required checks;
- no success claims without check results;
- if a check cannot run, document exact reason and what remains unverified.

After every wave, run relevant full checks. Before final report, run final aggregate checks and a read-only audit.

## Done when

Done means:

- all user-owned entities are owner-scoped;
- persistence is versioned and migration-tested;
- workout/session routes are unambiguous;
- navigation params contain only IDs and primitives;
- no JSON/callback/domain-object navigation params remain;
- one active session per owner is enforced;
- start and complete are idempotent;
- required result types are supported;
- session history remains stable after rename/archive/edit;
- critical screens have real loading/error/retry/submitting states;
- MVP flows survive restart;
- custom exercise create/edit/archive works;
- settings either persist or are hidden/disabled;
- API DTO boundary exists;
- auth shell boundaries exist;
- database contract is documented;
- critical unit/integration/migration/architecture tests exist;
- aggregate checks pass or exact environment blockers are documented;
- final read-only audit has no open P0/P1 findings.

Final deliverable:

Create `docs/codex-program/final-report.md` with summary, waves, threads/subagents, decisions, changed models, migration, navigation changes, session/result changes, MVP changes, API boundary, auth shell, database contract, tests/CI, security/privacy, command results, blockers, remaining P2/P3 backlog, branches/commits, rollback notes, and final readiness scores.

Return a concise user-facing summary with what was implemented, which checks passed, which blockers remain, and whether backend/auth/release-candidate work can proceed.
