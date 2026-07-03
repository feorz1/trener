# Risks

| Risk | Probability | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Cross-owner data leakage after auth | high | high | Add owner scope to domain, selectors, repositories, persistence keys before auth/backend | `02-owner-scope`, `03-persistence-v2` |
| Data loss during schema change | medium | high | Add deterministic v1 to v2 migration, validation, backup/quarantine path where possible | `03-persistence-v2` |
| Session/workout route ambiguity | high | high | Split `/sessions/[sessionId]` and `/sessions/[sessionId]/summary`; remove fallback param semantics | `04-session-routing` |
| Duplicate active sessions | medium | high | Enforce one active session per owner and typed conflict behavior | `06-active-session` |
| Duplicate or invalid result rows | medium | high | Introduce stable set identity and validate result ownership/session exercise membership | `05-result-types` |
| UI hides persistence/network failures | high | medium | Replace placeholder loading/error state with typed query/mutation state | `07-async-states` |
| Generated build output gets committed | medium | medium | Add generated-output policy and CI checks | `09-tests-ci` |
| Backend integration starts before data integrity is ready | medium | high | Enforce pre-backend read-only audit gate | `10-pre-backend-review` |
| Tokens stored in unsafe local snapshot | medium | high | Keep auth tokens in secure storage only; never in domain snapshot | `12-auth-shell` |
| AsyncStorage stores PII as plain local JSON | high | medium | Document privacy limits, avoid false encryption claims, define deletion/export policy | `19-production-hardening` |
| Runtime backend starts without provider/API decisions | high | high | Keep Waves 12B-12E blocked until provider, base URLs, credentials, server ownership, account model, and privacy decisions exist | external decision |
| Production auth starts without credential/account policy | high | high | Keep production auth blocked until provider, secure credential policy, account/user model, and local-data migration UX are approved | external decision |
| Release readiness is claimed before production gates exist | medium | high | Keep final release audit blocked until signing/release, monitoring/crash, privacy/retention/delete/export, accessibility level, and RC gates are approved | external decision |

## Baseline Notes

- Current checks pass, but they do not cover route semantics, owner isolation, auth, backend contracts, or many migration failure modes.
- Existing validation catches duplicate IDs and many bad references, but not owner scope or composite result uniqueness.
- Closure checks on 2026-06-22 passed for local MVP hardening, but they do not unblock backend/auth/production runtime work without the external decisions listed above.
