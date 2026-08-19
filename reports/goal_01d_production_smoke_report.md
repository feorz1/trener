# Goal 01D Production Smoke Report

Prepared: 2026-07-05
Updated: 2026-07-05

## Status

Status: hardening pass completed, with remaining production blockers.

The VPS stack is deployed behind Caddy with real Let's Encrypt certificates for the production domains. Core API/admin/data/backup/restore checks passed. Email auth smoke remains blocked until real SMTP credentials exist. Offsite backups are not configured.

## VPS

```txt
Host: 89.124.106.23
SSH: deploy@89.124.106.23:22 through alias trainer-vps
Deploy path: /opt/trainer-app
OS: Ubuntu 24.04.4 LTS, Linux 6.8.0-110-generic x86_64
Docker: Docker version 29.1.3, build 29.1.3-0ubuntu3~24.04.1
Compose: Docker Compose version 2.40.3+ds1-0ubuntu1~24.04.1
Firewall: ufw inactive
Ports: 80 and 443 open/listening through Docker proxy
```

Docker Compose v2 was missing initially. On this Ubuntu host the package name was `docker-compose-v2`, not `docker-compose-plugin`.

## Deployment

```txt
API domain: https://api.trener-app.com
Admin domain: https://admin.trener-app.com
.env.production: created on VPS only, mode 600
Admin owner: hardening-admin@admin.trener-app.com, smoke-only credential stored on VPS only
SMTP: smoke-only placeholder SMTP, no real SMTP server
TLS: Caddy + Let's Encrypt, trusted by curl without -k
Backup dir: /opt/trainer-app/backups
Offsite backup: none, production blocker
```

No real secrets were committed to git. Smoke tokens/passwords were kept only in VPS-local dotfiles under `/opt/trainer-app`.

## Stack

```txt
docker compose config: passed
Images built: trainer-app-api, trainer-app-admin
Containers:
  trainer-app-admin-1: healthy
  trainer-app-api-1: healthy
  trainer-app-backup-1: running
  trainer-app-caddy-1: running
  trainer-app-postgres-1: healthy
  trainer-app-redis-1: healthy
Prisma migrate deploy: applied 0001_init, 0002_trainer_data_sync, 0003_admin_panel
Prisma migrate status: Database schema is up to date
```

Note: the first `up -d --build` completed image builds but hung before creating containers. I stopped the stuck compose process and reran `up -d` using the built images. The final stack is healthy.

## API Smoke

```txt
HTTP -> HTTPS redirect: passed through Caddy
GET /health: passed, HTTP/2 200 on https://api.trener-app.com/health
GET /ready: passed, HTTP/2 200 on https://api.trener-app.com/ready
GET /auth/providers: passed, {"email":true,"yandex":false,"vk":false}
Admin system health: passed, {"api":"ok","database":"ok","redis":"ok"}
```

TLS evidence:

```txt
api.trener-app.com certificate issuer: Let's Encrypt YE1
api.trener-app.com subject: CN=api.trener-app.com
admin.trener-app.com certificate issuer: Let's Encrypt YE1
admin.trener-app.com subject: CN=admin.trener-app.com
cert notBefore: 2026-07-05
cert notAfter: 2026-10-03
```

## Auth Smoke

```txt
GET /me with smoke trainer A JWT: passed, 200
GET /me with smoke trainer B JWT: passed, 200
POST /auth/email/start: blocked, 500 because smoke SMTP endpoint is not real
POST /auth/email/verify: skipped, no delivered email code
POST /auth/refresh: skipped, no real email login refresh token
POST /auth/logout: skipped, no real email login refresh token
```

Production blocker: configure real SMTP in a follow-up goal. I did not weaken the production guard that rejects `EMAIL_SENDER=console`.

## Admin Smoke

```txt
Admin page opens: passed, GET https://admin.trener-app.com/admin/ -> HTTP/2 200
Admin login: passed, 200
Admin cookies: passed, Secure + HttpOnly session cookie observed
GET /admin/auth/me: passed, 200
GET /admin/stats/overview: passed, 200
GET /admin/trainers: passed, 200
GET /admin/security/auth-events: passed, 200
GET /admin/system/health: passed, 200, DB OK and Redis OK
GET /admin/audit-log: passed, admin.login event recorded
```

Finding: `Set-Cookie` returned duplicate `admin_session` header during curl smoke. It did not block login, but should be reviewed.

Admin action hardening:

```txt
Admin block trainer A: passed, 200
Admin unblock trainer A with empty application/json body: passed, 200
Admin revoke-sessions with empty application/json body: passed, 200
Regression test added in server/test/admin.test.ts
```

## Data Smoke

Smoke trainer users were created directly in PostgreSQL and signed with production access JWTs inside the API container because real email auth was blocked by missing SMTP.

```txt
Trainer A /me: passed
Trainer B /me: passed
Trainer A create client: passed
Trainer A create exercise: passed
Trainer A create workout session: passed
Trainer A start session: passed
Active session general PATCH guard: passed, 400 "Нельзя изменить состав уже начатой тренировки"
Trainer A save set result: passed
Trainer A complete session: passed
Trainer A bootstrap contains created client/exercise/session: passed
Trainer B bootstrap does not contain Trainer A client: passed
Trainer B create client: passed
Trainer B bootstrap contains B client and not A client: passed
Admin trainer detail shows mobile/API-created data: passed
Admin trainer clients tab contains smoke client: passed
Admin trainer workouts tab contains completed smoke session: passed
```

PostgreSQL counts after smoke:

```txt
users: 2
clients: 3
exercises: 2
workout_sessions: 2
workout_set_results: 1
```

## Blocked Trainer Smoke

```txt
Admin block trainer A: passed, 200
Trainer A /me after block: passed, 401
Trainer A /clients after block: passed, 401
Admin revoke sessions: passed after hardening, 200
Admin unblock trainer A: passed after hardening, 200
```

Finding fixed: empty `application/json` requests to no-body admin actions previously produced 500. The API now treats empty JSON bodies as `{}`; `revoke-sessions` and `unblock` return 200.

## Backup And Restore

Initial backup wrote to `/opt/trainer-app/deploy/backups` because the existing bind directory prevented the intended symlink. I stopped the backup service, moved dumps, replaced `deploy/backups` with a symlink to `/opt/trainer-app/backups`, restarted backup, and reran manual backup.

```txt
Manual backup: passed
Latest backup: /opt/trainer-app/backups/trainer_app_20260705T173232Z.sql.gz
Backup non-empty: passed, 5.8 KB
Restore target: temporary database trainer_app_restore_check
Restore: passed
Temporary DB dropped after verification: passed
```

Restore counts:

```txt
users: 2
auth_identities: 0
clients: 3
exercises: 2
workout_templates: 0
workout_sessions: 2
workout_set_results: 1
admin_users: 1
admin_audit_logs: 5
```

Production blocker: offsite backup target is `none`.

## Logs

Scanned last 200 lines for `api`, `admin`, `postgres`, `redis`, and `nginx` for obvious token/code/secret names:

```txt
accessToken
refreshToken
admin session token
email code
login ticket
client secret
JWT secret
SMTP password
OAuth provider token
JWT_ACCESS_SECRET
REFRESH_TOKEN
EMAIL_CODE
LOGIN_TICKET
SMTP_PASSWORD
```

Result: no matches.

## Local Checks

Completed before VPS smoke:

```txt
npm run api:typecheck: passed
npm run admin:typecheck: passed
npm run api:test: passed, 3 files / 17 tests
npm run api:typecheck: passed after hardening
npm run admin:build: passed
npm run design:audit: passed, 0 errors / 0 warnings
npm run typecheck: passed
```

## Skipped Or Blocked

```txt
Real mobile app on simulator/device: skipped, no mobile env/device run was provided in this turn
Real email auth verify/refresh/logout: blocked until SMTP credentials
Offsite backup: blocked, target is none
Soft delete smoke: not run in this pass
Mutation network-error fake-success smoke: not run in this pass
```

## Production TODO

1. Configure real SMTP and rerun email auth start/verify/refresh/logout.
2. Configure offsite backups.
3. Run the same API flow from the actual mobile app/simulator against `EXPO_PUBLIC_API_BASE_URL=https://api.trener-app.com`.
4. Run soft delete and mutation network-error smoke from mobile UI.
5. Review duplicate `admin_session` Set-Cookie header.
