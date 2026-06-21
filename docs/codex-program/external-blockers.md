# External Blockers

## Backend

- Backend provider/stack is not selected.
- Backend repository is not present.
- API base URLs for development, staging, and production are not available.
- API credentials and secret management policy are not available.
- Server-side ownership rules and authorization model are not finalized.

Planned local work before unblock:

- Define app-owned repository contracts. Completed locally in Wave 9 as `src/api/**` contracts; real provider remains blocked.
- Define DTO schemas and mappers. Completed locally in Wave 9 as contract-only DTO schemas/mappers.
- Define error normalization. Completed locally in Wave 9 as typed API error normalization.
- Document database model and ownership rules. Completed in Wave 11 as provider-neutral `docs/backend/**` contracts.

Wave 11 remaining blockers:

- A real backend provider, base URL, credential policy, and server ownership model are still required before backend repository implementations can begin.
- API credentials/secret management, conflict-resolution policy, privacy/retention policy, production auth provider, and account/workspace model are still required before production backend rollout.

## Auth

- Auth provider is not selected.
- Token storage requirements are not finalized beyond "not in domain snapshot".
- User/account/workspace model is not finalized.
- Local data migration UX after sign-in needs product approval.

Planned local work before unblock:

- Build auth shell states and guards. Completed locally in Wave 10 with development-only auth shell.
- Add current owner context. Completed locally in Wave 10 by mapping development sign-in to `local-trainer`.
- Keep development implementation separate from production provider. Completed locally in Wave 10 under `src/auth`.

Wave 10 remaining blockers:

- A production auth provider, secure persistent credential store policy, account/workspace model, and local-data migration UX are still required before real auth rollout.
- Normal logout currently preserves local data by design; destructive clear or account migration needs product approval.

## Production

- Signing credentials are not available.
- Monitoring/crash reporting provider is not selected.
- Privacy/retention/deletion requirements are not finalized.
- Release candidate acceptance gates are not finalized.

## Offline/Sync

- Server truth/source-of-truth policy must be confirmed before backend mutation rollout.
- Conflict resolution policy is not defined.
- Full offline editing is not promised until dirty flags/outbox/conflict UI/server versioning are deliberately added.
