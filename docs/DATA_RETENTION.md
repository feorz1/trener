# Data Retention and Deletion — Draft

> **Status: DRAFT — OWNER ACTION REQUIRED.** Current code behavior is documented below, but retention periods are not approved. No unspecified retention period should be presented to users or reviewers as final policy.

## Current storage and deletion behavior

| Data class | Current storage | Current lifecycle | Account-deletion behavior | Approval state |
| --- | --- | --- | --- | --- |
| Account identity | PostgreSQL; account email is also processed by the configured email provider | Retained while the account exists; no approved inactive-account window | Live user record and owner-linked rows are deleted by the account-deletion transaction | **OWNER ACTION:** approve retention and provider deletion terms |
| Access/refresh credentials | SecureStore on device; refresh-token hashes and session metadata on server | Access and refresh tokens have configured expiry; expired/revoked database-row cleanup is not an approved retention policy | SecureStore tokens and owner-linked refresh rows are removed during completed deletion | **OWNER ACTION:** approve post-expiry purge window |
| Login codes and login tickets | PostgreSQL; one-time code is sent through the configured email provider | Expiry is enforced for authentication, but physical row-purge timing is not approved | Matching account email codes are removed during live account deletion | **OWNER ACTION:** approve purge and provider-log retention |
| Client contact/profile/health data | Owner-scoped local snapshot; PostgreSQL; backups | Client archive/soft-delete behavior exists, but no approved archive or purge period exists | Owner-linked live records are deleted with the trainer account | **OWNER ACTION:** approve client-level deletion and retention rules |
| Workouts, schedules, sets, results, quick values and drafts | Local snapshot; server-backed entities in PostgreSQL; backups | No approved inactivity or historical retention period | Owner-linked live records and local owner cache are intended to be removed | **OWNER ACTION:** approve history/export policy |
| Activity and administrative audit records | PostgreSQL; backups | No approved audit retention period | Current deletion removes owner activity events and audit rows targeting the deleted trainer | **OWNER ACTION:** approve audit/legal-hold policy |
| Security metadata | Refresh/admin session and audit records; backups | Token/session expiry exists; no separately approved IP-hash/user-agent retention period | Owner-linked session rows are removed with the account; independent infrastructure logs are not verified | **OWNER ACTION:** inventory infrastructure logs and approve retention |
| Local device data | AsyncStorage owner snapshot and SecureStore tokens | Retained until owner cleanup, account deletion, or application storage removal | Client cleanup is intended to be idempotent after server confirmation | **OWNER ACTION:** confirm device-backup exclusion and logout policy |
| Account-deletion recovery | PII-free operation marker in AsyncStorage; owner ID and a 32-byte recovery proof in a device-only SecureStore item; completed receipt in PostgreSQL contains only operation UUID, domain-separated proof HMAC and timestamps | Server receipt TTL defaults to 24 hours and is configurable from 1–168 hours; expired receipt pruning must be scheduled operationally | Proof and marker are removed after idempotent local cleanup; no raw proof or account identity is stored in the receipt | **OWNER ACTION:** approve the receipt TTL and pruning schedule |
| PostgreSQL backups | Local compressed dumps; external copy is recommended by the runbook | Current local script default is seven days; this is an operational default, not an approved policy | Historical backups can contain data deleted from the live database | **OWNER ACTION:** approve retention, encryption, access and deletion reconciliation |

## Required production policy decisions

Before external TestFlight or App Store submission, the owner must approve:

1. A retention period or deletion trigger for every data class above.
2. Whether client deletion is immediate, soft-deleted for a defined interval, or retained under another approved rule.
3. Export/access procedures for trainer and client data.
4. Legal-hold rules and the authorized roles that may invoke them.
5. Infrastructure-log retention, including reverse proxy, VPS, database, email-provider, and administrative logs.
6. Local-device backup behavior and whether sensitive snapshots must be excluded from device/cloud backups.
7. Backup encryption, access control, geographic storage, offsite copies, and destruction schedule.
8. How deletions completed after a backup are reconciled after any restore.

## Backup restore reconciliation gate

Restoring an older backup can reintroduce records deleted after that backup was created. A production restore must therefore remain blocked until deletion reconciliation is complete.

The in-database receipt makes a lost HTTP response retryable, but a backup created before the deletion contains neither the deletion nor its later receipt. Receipt rows therefore must be exported to an authoritative post-backup deletion ledger before expiry and replayed against any older restore. Expired receipt pruning is allowed only after that ledger/export checkpoint succeeds.

- **OWNER ACTION:** Approve the authoritative deletion receipt/tombstone source.
- **OWNER ACTION:** Define the replay procedure for deletions completed after the restored backup timestamp.
- **OWNER ACTION:** Define a verification query/report that proves reconciled accounts and owner data are absent before traffic is restored.
- **OWNER ACTION:** Define who approves reopening traffic and how the evidence is retained.

Until this procedure is implemented and tested, backup restoration is not evidence that account deletion is durable.

## Review record

- Policy owner: **OWNER ACTION — unset**
- Legal reviewer: **OWNER ACTION — unset**
- Security/operations reviewer: **OWNER ACTION — unset**
- Approved retention schedule: **OWNER ACTION — unset**
- Effective date: **OWNER ACTION — unset**
- Next review date: **OWNER ACTION — unset**
