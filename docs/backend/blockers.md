# Backend Blockers And Open Questions

This file records unknowns that Wave 11 intentionally does not solve. Backend implementation threads must keep these as blockers unless the orchestrator provides an accepted decision.

## Blocking Decisions

| Area | Status | Required decision before production backend rollout |
| --- | --- | --- |
| Production backend provider | Blocked | Select the backend stack/provider, deployment model, environments, connection/runtime SDK, and operational owner. |
| Auth provider | Blocked | Select the real auth provider and token/session model. Wave 10 only provides a development auth shell. |
| Account/workspace model | Blocked | Decide whether an authenticated user owns one trainer account, can belong to multiple workspaces, can switch workspaces, or can delegate access. |
| Credential policy | Blocked | Decide secure token persistence, refresh, rotation, logout invalidation, local keychain usage, and whether offline credentials are allowed. |
| Server ownership rules | Blocked | Define server-side authorization, row-level ownership filters, admin/support access, and cross-workspace denial semantics. |
| API base URLs and credentials | Blocked | Provide development, staging, and production base URLs plus secret management rules. |
| Conflict resolution | Blocked | Define whether server versioning, optimistic concurrency tokens, dirty flags, or an outbox are required for sync. |
| Privacy and retention | Blocked | Define retention, export, deletion, audit log, and legal/privacy requirements for trainer and client data. |

## Contract-Level Assumptions For Now

- `owner_id` is the tenant filter for app-owned data because current domain entities are owner-scoped.
- `local-trainer` remains a development-only owner ID, not a production account ID.
- `account_id` and `workspace_id` are placeholders in this documentation until product/backend decisions are accepted.
- Tokens and provider credentials must never be stored in trainer domain tables or snapshots.
- Normal logout preserves local data in the current auth shell; destructive clearing or migration to a remote account requires product approval.
- Queries must behave as though every request is scoped to the authenticated owner/workspace even if the physical database later uses row-level security, collection paths, or server application filters.

## Non-Blocking Notes For Wave 12 Planning

- Backend client workers may start contract-only adapter and test planning after this Wave 11 commit, but production network rollout remains blocked by the decisions above.
- Provider-neutral tests can assert DTO shape, idempotency key requirements, active-session conflict shape, owner filtering, and mapper behavior without selecting a database.
- Any provider-specific migration files, SDK initialization, API URLs, credential storage, or production config are out of scope until the blocking decisions are resolved.
