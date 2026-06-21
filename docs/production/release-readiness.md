# Wave 13 Release Readiness Baseline

## Objective

This document is a **decision/readiness baseline**, not an implementation plan.
It defines gates for:
- security/privacy
- monitoring/crash reporting
- build/release config
- performance
- accessibility
- release gates and rollback notes

## Gate matrix (current)

| Domain | Gate | Status | Evidence |
| --- | --- | --- | --- |
| Design-system readiness | Token usage and design docs consistency | **Satisfied** | `npm run design:audit` in repository checks |
| Data/runtime correctness | Local checks | **Satisfied** | `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build:check` |
| Task-workflow governance | Repo-harness checks | **Satisfied (local)** | `PATH="$HOME/.bun/bin:$PATH" npm run check:task-workflow` |
| Security hardening | Provider setup & threat controls | **Blocked** | No monitoring/crash provider, no auth provider/token policy in this wave |
| Privacy/retention | Compliance policy + data-deletion contract | **Blocked** | Retention/export/delete still external decisions |
| Monitoring | Crash reporting + alerting | **Blocked** | Monitoring provider not selected |
| Release/build config | Signing/CI/release provider | **Blocked** | No production signing/release pipeline selected |
| Backend-aware release posture | Server auth and env controls | **Blocked** | Backend/provider/base URL/credentials unresolved |
| Accessibility baseline | Static + runtime UX accessibility review | **Partially satisfied** | Not fully captured in runtime checks; requires explicit review in final hardening pass |

## Monitoring and crash reporting baseline

### Required decision before claims of hardened production release
1. select crash/reliability provider
2. define capture policy:
   - stack trace levels,
   - breadcrumb/privacy scrubbing,
   - release sourcemap policy
3. define alerting thresholds and on-call routing

### Current docs-only outcome
- No provider implemented or configured in this wave.
- This is a hard blocker for “production observability readiness”.

## Build and release config baseline

### Required readiness evidence
- release signing strategy per platform
- EAS profile policy with versioning and track strategy
- migration-safe build scripts and changelog hooks
- secret handling for CI/CD

### Current status
- `build:check` (Expo web export check) is covered by `npm run check`.
- No signing or EAS production profile hardening done in this wave.
- No CI matrix/prod-release candidate gate defined.

## Performance baseline

### Current checks
- Local test/lint/typecheck build checks pass (`npm run check`).
- No production synthetic/perf budget checks are in repo scripts yet.

### Required items before release
- establish startup/build/performance budgets,
- add release smoke/perf regression checks (automated),
- define app-size and bundle-diff policy.

## Accessibility baseline

### Current checks
- No dedicated automation for accessibility regressions in wave scope.
- Accessibility remains a non-blocking documentation reminder until verified in explicit pass.

### Required items
- audit checklist aligned with critical screens,
- screen-reader state/state-change assertions,
- touch target + contrast + localization validations.

## Rollback and incident posture

### Documented today
- This branch is docs-only; no runtime rollout exists to rollback.
- Rollback at this stage means:
  - revert docs if incorrect guidance,
  - keep app in local-only profile until provider and release gates are satisfied.

### Recovery notes for next wave
- If monitoring/release infra is added, enable a two-step rollback:
  1. disable telemetry/reporter endpoint flags,
  2. revert release pipeline/secret rotation in CI if incident risk is detected.

## External blockers to release readiness

From current repo documentation:
- backend provider/stack undecided
- auth provider not selected
- API/auth secrets policy not defined
- monitoring/crash provider not selected
- production EAS signing/release policy unresolved
- accessibility acceptance criteria not defined

These blockers must be explicitly resolved before Wave 20 final audit.
