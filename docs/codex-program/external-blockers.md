# External Blockers

## Backend

- Backend provider/stack is not selected.
- Backend repository is not present.
- API base URLs for development, staging, and production are not available.
- API credentials and secret management policy are not available.
- Server-side ownership rules and authorization model are not finalized.

Planned local work before unblock:

- Define app-owned repository contracts.
- Define DTO schemas and mappers.
- Define error normalization.
- Document database model and ownership rules.

## Auth

- Auth provider is not selected.
- Token storage requirements are not finalized beyond "not in domain snapshot".
- User/account/workspace model is not finalized.
- Local data migration UX after sign-in needs product approval.

Planned local work before unblock:

- Build auth shell states and guards.
- Add current owner context.
- Keep development implementation separate from production provider.

## Production

- Signing credentials are not available.
- Monitoring/crash reporting provider is not selected.
- Privacy/retention/deletion requirements are not finalized.
- Release candidate acceptance gates are not finalized.

## Offline/Sync

- Server truth/source-of-truth policy must be confirmed before backend mutation rollout.
- Conflict resolution policy is not defined.
- Full offline editing is not promised until dirty flags/outbox/conflict UI/server versioning are deliberately added.
