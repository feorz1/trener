# Decisions

## 2026-06-20 - Gate 0 Baseline Decisions

Status: accepted for implementation planning.

Context:

- The app is currently single-local-trainer, local-first, and backed by AsyncStorage.
- Domain entities do not yet include `ownerId`.
- Persistence uses schema version `1` and a global storage key.
- Routes currently overload workout and session IDs in some session and summary screens.
- Current hooks expose synchronous local state as `{ isLoading: false, error: null }`; this is not a durable async contract for persistence/auth/API.
- Current active-session guard is per workout, not per owner.

Decisions:

1. There is exactly one active workout session per owner.
2. Entity IDs remain stable strings.
3. Until real auth exists, the local owner ID is `local-trainer`.
4. Scheduled date-times are stored as UTC ISO strings.
5. Timezones are stored as IANA timezone identifiers.
6. A session route accepts only `sessionId`.
7. A workout route accepts only `workoutId`.
8. Old snapshots are migrated, not cleared.
9. Old exercises default to `weight_reps` when result types are introduced.
10. Auth tokens never live in the domain snapshot.
11. Screens continue to consume repository/hooks boundaries, not storage, DTOs, or transport clients directly.

Consequences:

- Owner scope must land before owner-scoped persistence.
- Persistence v2 must preserve all old IDs and assign `ownerId: "local-trainer"` to migrated local entities.
- Session routing must create `/sessions/[sessionId]` and `/sessions/[sessionId]/summary` before backend route contracts are considered ready.
- API/auth work is blocked until data integrity waves pass pre-backend review.
- The async state wave must define reusable query/mutation state shapes before screens are broadly rewritten.

## 2026-06-20 - No Backend Stack Yet

Status: accepted.

Context:

- No backend repository, backend provider, auth provider, API URL, or credentials are present.

Decision:

- Do not add a backend framework or fake production endpoints during app hardening.
- Prepare app-owned contracts, DTO schemas, mappers, repositories, and blockers instead.

Consequences:

- Backend rollout threads must stop at contracts/mocks until real provider decisions exist.

## 2026-06-21 - Wave 10 Auth Shell

Status: accepted for local development shell.

Context:

- Auth provider, token persistence policy, and user/workspace model are still external blockers.
- The app must remain usable locally before real auth/backend work starts.
- Existing local data is already owner-scoped to `local-trainer`.

Decision:

- Use a development-only auth provider that signs in as `local-trainer`.
- Keep credentials behind `src/auth` credential-vault contracts; do not write auth tokens into the domain snapshot.
- Preserve existing local data on normal logout.
- Do not migrate local data to a remote/user account until product approves the sign-in migration UX.

Consequences:

- Signed-in routes can be guarded now without selecting a production auth provider.
- Real provider SDKs, credential persistence, account/workspace mapping, and destructive local-data migration remain blocked.
