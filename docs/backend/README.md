# Backend Contract Index

Wave 11 documents the database contract for a future backend implementation. This directory is documentation-only and does not add a backend provider, SDK, executable migration, API client, route change, persistence change, auth provider, or production configuration.

Read in this order before Wave 12 backend client work:

1. [database-contract.md](database-contract.md) - entity model, ownership rules, lifecycle fields, result shapes, invariants, indexes, idempotency, and migration notes.
2. [blockers.md](blockers.md) - external decisions that must be resolved before production backend rollout.
3. `src/api/README.md`, `src/api/dto.ts`, `src/api/contracts.ts`, and `src/api/schemas.ts` - app-owned API boundary from Wave 9.
4. `src/auth/types.ts` - auth shell boundary from Wave 10.

The contract intentionally mirrors the current local domain and API DTO shape:

- entity IDs are stable strings;
- owner-scoped entities carry `owner_id`;
- local development maps to `local-trainer` until production auth/account mapping is decided;
- scheduled timestamps are UTC ISO strings, with IANA timezone fields where the app already records them;
- mutation operations require idempotency keys at the API boundary;
- the database must preserve the one-active-session-per-owner invariant.

Wave 12 workers may use these docs to design contract tests and repository adapters, but must not treat provider-specific storage, auth, credential policy, or server ownership rules as decided.
