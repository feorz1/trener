# Production Hardening Baseline (Wave 13)

This directory contains the docs-only production readiness baseline for
`codex/19-production-hardening`.

## Scope and non-goals

- **Scope:** documentation baseline for production hardening and release readiness.
- **Non-goals:** no runtime implementation in this wave.
  - no backend provider changes
  - no auth provider SDK/token persistence rollout
  - no API transport or repository runtime adapters
  - no persistence migrations/routing/UI/signing/monitoring SDK setup changes

## Reference boundary for this branch

- Current branch: `codex/19-production-hardening`
- Writable path in this wave: `docs/production/**`
- Required baseline files:
  - `docs/production/release-readiness.md`
  - `docs/production/security-privacy.md`

## What this baseline defines

1. Readiness gates for release and production readiness
2. Security baseline and current gaps
3. Privacy and retention baseline for local data and future sync
4. Monitoring/crash-reporting decision and failure-handling expectations
5. Build/release configuration expectations and missing decisions
6. Performance and accessibility baseline with concrete checks
7. Rollback plan and explicit blockers

## Current state at a glance (as of 2026-06-21)

- This repo already has strong local-domain reliability and test checks (`npm run check` passes on integration in wave history).
- This wave intentionally stays docs-only and does **not** add providers or infra.
- Release-readiness is therefore “**design-ready, not infra-deployed**”.

### Completed locally by evidence
- `npm run lint`
- `npm run typecheck`
- `npm run design:audit`
- `npm run test`
- `npm run build:check`
- `npm run check:task-workflow` (strict) can run in this branch once required local harness directories exist.

### Not completed by design in this wave (explicit blockers)
- monitoring provider selection
- crash reporting provider setup
- release provider/signing pipeline in EAS production
- production auth provider/token policy
- backend provider and base URL environment chain

## Required follow-up for moving to final audit

Before final audit, production runtime decisions above must be accepted and documented in follow-up waves or by the orchestrator.
This directory is the decision/readiness handoff boundary and should be revisited before any merge into the final audit wave.
