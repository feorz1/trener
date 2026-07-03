---
title: "Codex Goal"
kind: "codex-goal"
created_at: "2026-06-21T22:26:57.007Z"
source: "repo-harness-mcp"
---
# Codex Goal: close local MVP hardening and external blockers

## Source of truth

Repository: `/Users/gpbu7557/.codex/worktrees/913e/New project`.

Current branch: `codex/integration`.

Use the current repository state as the source of truth. Read `AGENTS.md`, repo-harness workflow files, `package.json`, project docs, existing `docs/codex-program/*` files, data layer, persistence, routes, tests, and the current git state before making changes.

This goal supersedes the previous broad orchestration goal. The previous goal was too wide for autonomous completion because backend, auth, production, monitoring, release, privacy, and credential choices require external decisions that are not present in the repository.

## Role

You are the Codex worker closing the current program safely.

Do not continue broad backend/auth/production implementation.

Your role is to verify the completed local work, document what is finished, document external blockers, convert later waves into docs-only/blocked follow-ups, and produce a clean handoff.

## Scope

Finish the current program as:

`Local MVP hardening complete; backend/auth/production require external decisions.`

Do only the following:

1. Inspect current `codex/integration` state.
2. Check whether local MVP hardening work is complete enough to close this phase.
3. Run available checks from `package.json`.
4. Update `docs/codex-program/final-report.md` with:
   - what was completed locally;
   - what checks were run;
   - which checks passed or failed;
   - what remains blocked externally;
   - recommended next steps.
5. Update `docs/codex-program/external-blockers.md` with explicit blockers:
   - backend provider;
   - API base URLs;
   - credentials/secrets policy;
   - server ownership;
   - auth provider;
   - account/user model;
   - production signing/release policy;
   - monitoring/crash reporting provider;
   - privacy/data-retention decisions;
   - accessibility acceptance level.
6. Update `docs/codex-program/roadmap.md` so Waves 9–13 are marked as blocked, docs-only, or awaiting external decision unless already safely implemented as contracts/docs.
7. Update `docs/codex-program/progress.md` with the current closure status.
8. If needed, update `docs/codex-program/risks.md` with remaining P2/P3 risks and external blockers.
9. Do not create a backend.
10. Do not add a real auth provider.
11. Do not implement production monitoring, signing, release pipelines, or secret handling without explicit external decisions.
12. Do not fake integrations.
13. Do not claim release readiness unless checks and final review support it.

## Required workflow

1. Start with reconnaissance:
   - `git status`;
   - inspect `docs/codex-program/*`;
   - inspect package scripts;
   - inspect latest implemented waves;
   - identify whether uncommitted/generated files exist.
2. Run checks available in the project. Prefer the aggregate check if it exists. Otherwise run the real individual scripts.
3. Do not alter application code unless required to fix documentation/check closure issues. This is primarily a closure and documentation goal.
4. If a check fails because of an actual local MVP regression, stop and document the blocker instead of pushing into broad implementation.
5. If a check cannot run due to environment constraints, document the exact command, error, and what remains unverified.
6. Keep all changes limited to closure docs unless a very small fix is required to make docs/check state consistent.
7. Produce a concise final handoff in `docs/codex-program/final-report.md`.

## Required checks

Read `package.json` and run the real available scripts.

Expected checks or equivalents:

- `npm run typecheck`
- `npm run lint`
- `npm run design:audit`
- `npm run test`
- `npm run build:check`
- aggregate `npm run check`, if available

Do not create fake passing scripts.

Do not suppress exit codes.

Do not use `|| true` for required checks.

Record exact command results in the final report and progress file.

## Done when

This goal is complete when:

- `codex/integration` has been inspected;
- available checks have been run or exact environment blockers documented;
- `final-report.md` clearly says what local MVP hardening completed;
- `external-blockers.md` lists backend/auth/production decisions required from the user/team;
- `roadmap.md` no longer implies Codex should autonomously implement Waves 9–13 without external decisions;
- `progress.md` shows closure status;
- no backend, real auth provider, monitoring provider, signing pipeline, production secrets, or fake integrations were added;
- the final user-facing summary says whether local hardening is complete, whether backend/auth can proceed, and what decisions are needed next.
