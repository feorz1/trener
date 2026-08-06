# Plan: iOS Release Candidate

> **Status**: Executing; final release authorization supplied 2026-07-29
> **Created**: 20260722-1044
> **Slug**: ios-release-candidate
> **Planning Source**: repo-harness-goal
> **Orchestration Kind**: native-goal
> **Source Ref**: `/Users/gpbu7557/Downloads/аудит (1).txt` and `/Users/gpbu7557/.codex/attachments/37956334-567e-4d6f-a0b4-74188bef3ea1/pasted-text.txt`
> **Spec**: `docs/spec.md`

## Agentic Routing

- Selected route: phased release implementation.
- Routing reason: the attached implementation contract supplies ordered scope, hard non-goals, machine-checkable acceptance, and stop conditions.
- Due diligence:
  - P1 map: Expo Router/mobile state/API/server/Prisma/deploy/native/EAS/CI release surfaces.
  - P2 trace: verify reported mobile data and auth/deletion flows end to end before modifying them.
  - P3 rationale: additive compatibility, fail-closed production config, idempotency, owner isolation, and reproducible gates.

## Workflow Inventory

- Active plan: `plans/plan-20260722-1044-ios-release-candidate.md`
- Deferred-goal ledger: `tasks/todos.md`
- Current checks: `.ai/harness/checks/latest.json`
- Run snapshots: `.ai/harness/runs/`
- Execution surface: current worktree, because the 10 modified and 4 untracked baseline files are release-relevant user work that cannot be stashed, reset, overwritten, or safely projected into a clean contract worktree.

## Scope

1. Restore mobile tests and Expo SDK 54 dependency alignment.
2. Fix owner bootstrap preservation, recurrence/per-set targets, and muscle-group roundtrips.
3. Fix trusted proxy/rate limits, atomic token/ticket consumption, admin CSRF, and email config.
4. Implement durable account-deletion receipts, network timeouts, SecureStore recovery, and cache isolation.
5. Add guarded disposable PostgreSQL coverage, deployment/readiness sequencing, backup validation, and restore tooling.
6. Add privacy/support/App Review documentation, privacy-manifest validation, and redacted observability.
7. Repair iOS icon/launch/native config; add EAS/toolchain/CI readiness without inventing external identifiers.
8. Run full local gates, production export, unsigned Release build, artifact validation, and final independent review.

## Non-goals

- No destructive Git commands, git push, external TestFlight group, external testers, Beta App Review, or App Store Review submission.
- Do not invent EAS owner/project ID, Apple Team ID, App Store Connect app ID, credentials, production secrets, legal entity name, or postal/tax details.
- No SDK-major or unrelated broad dependency upgrade.
- Production mutation remains gated by one explicit deploy confirmation after sanitized backup/restore/migration/rollout evidence is presented.

## Evidence Contract

- **State/progress path**: this plan, the active native goal, Git change ledger, targeted regression tests, and final release report.
- **Verification evidence**: requested package scripts, Expo checks, Prisma validation, guarded real-PostgreSQL suite, production export, unsigned Release `.app`, and artifact audits with exit codes.
- **Evaluator rubric**: no remaining safely automatable P0/P1; required data-integrity/production-readiness P2 closed; only explicitly external gates may remain.
- **Stop condition**: all automatable acceptance checks pass, or a remaining check has objective evidence of an excluded credential/legal/device/safe-environment dependency.
- **Rollback surface**: no commit; task-owned edits remain individually reviewable, additive migrations include compatibility notes, and baseline user changes stay intact.

## Task Breakdown

- [x] Baseline and release-gate recovery
- [x] Mobile data-integrity roundtrips
- [x] Backend auth, proxy, CSRF, and email security
- [x] Deletion recovery, timeouts, startup recovery, and cache isolation
- [x] Disposable PostgreSQL, deploy, backup, and restore readiness
- [x] Privacy, support, observability, and App Review surfaces
- [x] iOS assets/native config and EAS/toolchain/CI readiness
- [ ] Final distributable export/EAS/Apple verification (release values approved; remote identifiers are discovered after authentication)

## Final Local Evidence — 2026-07-22

- `npm run check`: PASS; mobile/API/admin typechecks, 0 design audit errors/warnings, unit/integration/server/ops tests, and web export all green.
- `npx --yes expo-doctor@1.17.11`: 16/16 PASS with pinned Node 20.19.4, npm 10.9.3, and CocoaPods 1.16.2 available on `PATH`.
- `npx expo install --check`: dependencies current against the local SDK 54 map; the command explicitly reported offline endpoint fallback.
- `npx prisma validate --schema server/prisma/schema.prisma`: PASS.
- Disposable PostgreSQL 16.14: migrations `0001` through `0008`, 10/10 real-PG tests, 281-exercise seed, seven-check read-only production preflight, and restore drill all PASS.
- Security specialist re-review: no findings after rejecting URI routing parameters/fragments and ambient libpq target overrides before destructive database actions.
- Architecture specialist re-review: no findings in account-deletion lifecycle, owner binding, proof-first reconciliation, and legacy recovery.
- Unsigned Release Simulator build: `BUILD SUCCEEDED`; Node 20 bundle, Hermes bytecode, universal simulator binary, privacy manifests, icon/splash resources, and embedded Expo config verified.
- Release runtime smoke without Metro: install/launch PASS, login UI and email-login navigation reachable. A white-screen crash caused by the `expo-constants` path-with-spaces script was reproduced from native logs, fixed with a patch-package patch, rebuilt, and verified absent from subsequent logs.
- `npm audit --omit=dev --audit-level=high`: exit 0; no high/critical advisories, 16 moderate advisories remain in the Expo SDK 54 toolchain graph and only advertise a breaking Expo 57 force-upgrade.

## Current Remote Stop Conditions

The approved release identity is `com.trenerapp.trener`, display name `Trener`, version `1.0.0`, initial local build `1`, API origin `https://api.trener-app.com`, privacy/support routes on that origin, and support/review contact `support@trener-app.com`. Expo owner/project ID, Apple Team ID, and App Store Connect app ID are discovered or created only after the corresponding authentication step. Execution may pause only at the interactive/authentication, owner/team selection, App Store Connect record creation, mailbox confirmation, production deploy confirmation, or factual remote build/processing points authorized by the replacement goal.
