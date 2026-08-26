# Production release and restore runbook

This is the authoritative release-order runbook for the production compose stack. `docs/DEPLOY_VPS.md` remains useful for initial host provisioning, but its older “start everything, migrate later” sequence must not be used for a release.

## Safety boundaries

- Keep `.env.production` untracked. Start from the root `.env.production.example` and source values from the production secret manager.
- Never paste `docker compose config`, database URLs, env files, SMTP credentials, deletion receipt exports, or logs containing request data into tickets or CI artifacts.
- `PREFLIGHT_DATABASE_URL` is mandatory and explicit. The preflight script never falls back to `DATABASE_URL`, runs the transaction read-only, and prints only check names, violation counts, host, port, and database name.
- `restore-drill.sh` is intentionally unusable with `NODE_ENV=production`, a production host/domain, an ordinary database name, a missing acknowledgement, an IPv6 target, URI query/fragment overrides, or ambient PostgreSQL target variables (`DATABASE_URL`, `PGHOST`, `PGHOSTADDR`, `PGPORT`, `PGDATABASE`, `PGSERVICE`, `PGSERVICEFILE`). Only the explicit plain `TEST_DATABASE_URL` may identify the destructive target.
- A schema migration in a rolling release must be backward-compatible with both the old and new API. Add tables/columns/indexes first; defer destructive renames, type changes, and column drops until the old API can no longer run.

## Prepare and validate

Copy the tracked shape, then fill the copy from the secret manager without committing it:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Required release-specific values include `DATABASE_URL`, separately assigned `PREFLIGHT_DATABASE_URL`, PostgreSQL credentials, API/auth/email secrets, canonical HTTPS origins, `TRUSTED_PROXY_CIDRS`, public app URLs, the latest `EXPECTED_MIGRATION`, and a unique immutable `RELEASE_IMAGE_TAG` such as a commit SHA. Empty or placeholder secrets are a release stop. Reusing an image tag is also a release stop because it can prevent one-shot jobs from being recreated predictably.

Run local, non-networked ops tests before accessing production:

```bash
bash scripts/test-backup-postgres.sh
bash scripts/test-postgres-guards.sh
bash scripts/test-release-ops-config.sh
```

Validate the merged compose model. Treat its output as sensitive because Compose can materialize environment values:

```bash
sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.release.yml \
  config --quiet
```

## Back up and prove restore before release

Create a backup. The script publishes only after `pg_dump`, format validation, compression, and `gzip -t` all pass; retention runs only after that atomic publish.

```bash
sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.release.yml \
  run --rm backup /usr/local/bin/backup-postgres.sh
```

Copy the new backup to protected off-host storage, then prove it against a disposable database. `TEST_DATABASE_URL` must point to an isolated database whose name explicitly contains `test`, `disposable`, `restore`, or `ci`.

```bash
NODE_ENV=test \
ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
TEST_DATABASE_URL='postgresql://<test-user>:<test-password>@127.0.0.1:5432/trainer_restore_test' \
BACKUP_FILE='/protected/path/trainer_app_<timestamp>.sql.gz' \
bash deploy/scripts/restore-drill.sh
```

Unset `DATABASE_URL`; do not substitute it or run this command against a production host. The script drops and recreates the `public` schema of the approved disposable database.

## Ordered rollout

The merged compose graph enforces this order:

1. PostgreSQL becomes healthy.
2. `migrate` runs `prisma migrate deploy` once and must exit zero.
3. `seed` runs the idempotent system-exercise seed and must exit zero.
4. `preflight` checks migration state, active-email uniqueness, cross-owner links, orphans, FK delete rules, the system seed, and the release schema contract in a read-only transaction.
5. The API starts and becomes healthy only when `/ready` succeeds and the required migration/tables/columns are present.
6. Caddy starts or is updated only after API and admin health checks pass.

Build first while the old API is still serving traffic, then start the graph:

```bash
sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.release.yml \
  build api admin migrate seed

sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  -f deploy/docker-compose.release.yml \
  up -d
```

The current release migrations `0007_add_workout_roundtrip_contract`, `0008_add_account_deletion_receipts`, `0009_add_superseded_workout_session_status`, and `0010_workout_series` are additive. Before applying `0010`, require the Stage 1 app version (or temporarily freeze recurring-workout writes), drain old API replicas, and only then migrate and start the new API. Old clients may continue reading materialized sessions, but an old recurring-session write made after the one-time backfill would not create a series. A single API replica can still have a short restart gap; this sequence provides fail-closed ordering, not zero downtime.

Verify job exits and service health without printing env values:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml -f deploy/docker-compose.release.yml ps -a
curl --fail --silent --show-error https://<api-host>/health
curl --fail --silent --show-error https://<api-host>/ready
```

Do not start or reload Caddy manually before the API health gate passes.

## Failed rollout and rollback

If `migrate`, `seed`, or `preflight` exits non-zero, keep the old API serving and do not force-start the new API or Caddy. Capture only sanitized job status and check names.

For an application rollback, redeploy the prior image tag while retaining additive database changes. Do not reverse Prisma migrations with ad hoc SQL. If the new code has already written data in a new shape, stop and review compatibility before rolling back the application.

## Restoring an older production backup after account deletion

An old snapshot can resurrect data deleted after that snapshot. Before any production restore:

1. Stop writes and capture the current `account_deletion_receipts` rows to an encrypted, access-controlled file using `pg_dump --data-only --table=account_deletion_receipts --column-inserts --on-conflict-do-nothing`. Never print or attach this file; it contains recovery-secret hashes.
2. Export the separate post-backup deletion/tombstone ledger that maps each deletion to the data subject that must remain deleted.
3. Restore the chosen backup, apply all migrations, and run the idempotent seed while public traffic remains stopped.
4. Replay the protected deletion receipt SQL with `psql -X --set=ON_ERROR_STOP=1`, then reapply every post-backup deletion from the tombstone ledger.
5. Run `production-preflight.sh`, start the API, wait for schema-aware health, and only then allow Caddy to serve traffic.

Important limitation: `account_deletion_receipts` deliberately stores operation IDs and recovery-secret hashes, not a user mapping. Replaying receipt rows preserves idempotency but cannot by itself identify and remove a user resurrected by an older backup. If no separate protected deletion/tombstone ledger exists for the interval between backup and restore, an old-backup production restore cannot be declared privacy-safe; stop and escalate instead of reopening traffic.
