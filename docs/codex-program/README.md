# Codex Program

This directory tracks the multi-wave hardening program for the trainer mobile app before backend, auth, database, and production rollout.

## Goal

Prepare the current Expo React Native trainer app for safe owner-scoped local data, versioned persistence, unambiguous navigation, stable workout/session/result models, real async states, API boundaries, auth shell integration, database contracts, and production checks.

## Current State

- App stack: Expo `~54.0.35`, Expo Router `~6.0.24`, React `19.1.0`, React Native `0.81.5`, TypeScript `~5.9.2`.
- Data layer: app-facing repository contracts in `src/data/contracts.ts`, implemented locally inside `src/data/DataProvider.tsx`.
- Persistence: AsyncStorage adapter under `src/data/persistence`, schema version `2`, owner-scoped storage key after Wave 2.
- Backend/auth: contract-only API boundary and development auth shell exist; real backend provider and production auth provider are not selected.
- Integration branch: `codex/integration`.
- Current integration branch: `codex/integration`.
- Current program status: local hardening and documentation baseline merged; backend/auth/production runtime rollout and final release-ready audit remain externally blocked.

## Rules

- Do not work directly on `main` or `master`.
- Do not implement the whole roadmap as one large diff.
- Each implementation thread gets its own branch/worktree and disjoint write ownership.
- Gate 0 must finish before implementation threads begin.
- Screens must not access storage or backend DTOs directly.
- Navigation params must be IDs/primitives only.
- Auth tokens must never be stored in the domain snapshot.

## Checks

Use the real project scripts from `package.json`:

```bash
npm run lint
npm run typecheck
npm run design:audit
npm run test
npm run build:check
npm run check
```

Baseline on 2026-06-20, verified from branch `codex/integration` at commit `2e31559`:

- `npm run check`: passed end to end.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run design:audit`: passed, 0 errors, 0 warnings.
- `npm run test`: passed.
- `npm run build:check`: passed, writes `.expo-export-check/`.

## Gate 0 Verification

Gate 0 is documentation and orchestration only. The current audit was reconfirmed against:

- `src/data/types.ts` and `src/types/*` for domain shape.
- `src/data/contracts.ts`, `src/data/DataProvider.tsx`, `src/data/hooks.ts`, and `src/data/local/*` for repository, selector, and hook behavior.
- `src/data/persistence/*` for schema version, storage key, migration, validation, and hydration behavior.
- `app/**` and `scripts/lint-architecture.ts` for route contracts and route-param guard coverage.
- `scripts/test-*.ts` for current regression coverage.

Latest orchestration gates on 2026-06-21:

- `npm run check`: passed for the current README/final-readiness report update.
- `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow`: passed for the current README/final-readiness report update.

## Program Documents

- `roadmap.md`: waves, dependencies, owners, branches, checks, and blocked final audit status.
- `progress.md`: current status by wave through Wave 13 production hardening baseline.
- `decisions.md`: Gate 0 decisions and later ADR-style records.
- `risks.md`: confirmed risks and mitigations.
- `file-ownership.md`: write ownership map and merge order.
- `external-blockers.md`: decisions or credentials not available locally.
- `final-report.md`: current readiness report with final audit blocked by external backend/auth/production decisions.
