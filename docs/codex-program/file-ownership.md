# File Ownership

Only one live writer may own a file at a time. Other threads may read owned files but must not edit them.

## Wave Ownership Map

| Thread | Allowed write scope | Forbidden overlaps |
| --- | --- | --- |
| `00-orchestrator` | `docs/codex-program/**`, repo-harness handoff/progress files | product implementation except small orchestration-only metadata |
| `01-baseline-decisions` | `docs/codex-program/**` | product code, data schema, routes |
| `02-owner-scope` | `src/types/**`, `src/data/types.ts`, `src/data/contracts.ts`, `src/data/DataProvider.tsx`, `src/data/local/**`, `src/data/seeds/**`, owner-focused tests | `src/data/persistence/storageKeys.ts`, route migrations, API/auth directories |
| `03-persistence-v2` | `src/data/persistence/**`, persistence tests, owner-scoped storage wiring after owner scope | route files, result UI, backend API |
| `04-session-routing` | `app/workouts/**`, `app/clients/**` route call sites, navigation helpers, route architecture tests | persistence schema, result model schema unless required by route signatures |
| `05-result-types` | `src/types/workout.ts`, result-related data contracts, session/result selectors, active session result UI, result tests | storage key migration, auth/API |
| `06-active-session` | session start/complete invariants in `src/data/DataProvider.tsx`, session selectors/tests, conflict UI | route rename work already owned by session-routing |
| `07-async-states` | `src/data/hooks.ts`, typed data errors, mutation/query state helpers, screen state handling | persistence migration internals, owner schema unless required |
| `08-mvp-hardening` | draft lifecycle, custom exercises, settings visibility/persistence, timezone helpers/tests | shared files must be subdivided before parallel workers start |
| `09-tests-ci` | `scripts/**`, CI config, architecture tests, `.gitignore` generated-output policy, test fixtures | domain behavior changes unless needed to fix tests |
| `11-api-boundary` | `src/api/**`, DTO schemas/mappers, repository interfaces/adapters, contract tests | auth token lifecycle, UI rewrites |
| `12-auth-shell` | auth provider shell, route guards, secure token boundary, owner context integration | backend domain implementations |
| `13-database-contract` | `docs/backend/**` | app runtime code unless explicitly needed for contracts |
| backend domain threads | selected `src/api/**` repository implementation and domain-specific tests | other backend domain slices |
| `19-production-hardening` | production config/docs/security/privacy/monitoring checks | unrelated feature work |

## Hot Files

These files need explicit coordination before any parallel writes:

- `src/data/DataProvider.tsx`
- `src/data/contracts.ts`
- `src/data/types.ts`
- `src/types/workout.ts`
- `src/data/local/localSelectors.ts`
- `src/data/persistence/validation.ts`
- `src/data/persistence/serializeSnapshot.ts`
- `app/(tabs)/index.tsx`
- `app/sessions/[sessionId]/index.tsx`
- `app/sessions/[sessionId]/summary.tsx`
- `scripts/lint-architecture.ts`

## Merge Rules

- Merge owner scope before persistence v2.
- Merge persistence v2 before auth owner-key switching.
- Merge session routing before route-contract API work.
- Merge result types before backend results/history.
- Run full checks after each merge into `codex/integration`.

## Next Writer

Waves 4, 5, 6, 7, and 8 are merged into `codex/integration`. The next writer is the pre-backend review gate (`10-pre-backend-review`) in a separate thread/worktree. It should be read-only unless review evidence requires docs-only notes; API boundary, auth shell, database contract, backend, and production hardening remain forbidden until this gate is reviewed.
