# Security, Privacy, and Data Retention Baseline

## Data model risk classes

The app domain stores potential PII and health-related data in:
- `clients`: name, contacts, medical/goal notes, restrictions, schedule
- `workout / session / result`: titles, sets, comments, previous results, timestamps
- `quick_values`: personal performance metrics

Local storage and future sync behavior must assume data sensitivity.

## What is already covered by local implementation

- No auth/session tokens are stored in domain snapshots.
- `local-trainer` is dev-only and explicit in docs/contracts.
- Owner-scoped model is already documented and enforced in contracts and local data behavior.
- Privacy/security reminders are documented in backend contracts (`docs/backend/database-contract.md`) and blockers (`docs/backend/blockers.md`).
- Persistence schema is deterministic and migration-aware (`v2`) with local key scoping.

## Immediate baseline requirements for production hardening

### Security baseline
- Threat model must include:
  - token leakage into snapshots (must be prohibited),
  - cross-owner read/write attempts (must fail as not-found/forbidden),
  - local device theft/device backup leakage.
- App code must not log sensitive payloads:
  - client notes/restrictions/contacts,
  - results payloads,
  - idempotency/secret-like bodies.
- Error output must be sanitized for external consumers.

### Privacy + retention baseline
- Define and publish:
  - retention window for each entity class,
  - explicit delete/export semantics for trainer data,
  - legal hold and support workflow,
  - device-level data clear behavior on sign-out policy decision.
- Do not ship any automatic retention or deletion implementation without:
  - approved policy document,
  - test plan.

## Blocked by unresolved decisions

These must be resolved before backend rollout; they are blockers for “production hardened” claim:

1. Production auth provider and credential policy
2. Backend account/workspace model and ownership enforcement
3. Backend secret delivery model
4. Encryption and storage policy for at-rest local backups (if required by policy)
5. Deletion/export contract for PII and trainer history

## Rollback implications (docs-only scope)

No runtime setting can be rolled back in this wave because no runtime runtime is changed.
Operational fallback at this stage is to keep this branch docs-only and continue current local-only behavior until the blockers are unblocked.
