# Deployment Operations

`deploy/` is a commit-ready surface for deployment and operations runbooks, submission materials, release checklists, helper scripts, and env examples.

## Track

- `deploy/scripts/` for operational scripts.
- `deploy/submissions/` for submission or review materials.
- `deploy/runbooks/` and `deploy/release-checklists/` for operational documentation.
- `deploy/sql/` for ordered deployment SQL files named like `0001_create_tables.sql`.
- `deploy/*.md` for runbooks and operating notes.
- `.env.production.example` for the production variable shape. Keep the copied `.env.production` untracked.

## Do Not Track

- `_ops/`
- private keys, real env files, provider state, production tokens, credential dumps, artifacts, logs, and local-only overrides

Keep external upstream checkouts and source references in `_ref/`; `_ref/` is ignored and must stay out of commits.

## Production release path

Use [`runbooks/production-release.md`](./runbooks/production-release.md) with the base `docker-compose.prod.yml` plus `docker-compose.release.yml`. The release overlay adds ordered migration, seed, read-only preflight, and schema-aware API health gates without assuming that the base compose file owns those jobs.

Operational safety checks can be run without Docker or a database:

```bash
bash scripts/test-backup-postgres.sh
bash scripts/test-postgres-guards.sh
bash scripts/test-release-ops-config.sh
```
