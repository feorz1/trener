# Goal 03 Production Auth Providers Report

Prepared: 2026-07-05
Updated: 2026-07-09

## Status

Status: Resend production email provider implemented and deployed; production backend email auth smoke passed with a real recipient inbox and delivered code. iOS Simulator mobile smoke is partially passed against the production API: email login, bootstrap, client creation, exercise creation, workout session creation/start/complete, and PostgreSQL persistence were verified. Admin owner access was restored on 2026-07-09 and admin panel login was verified. Trainer isolation remains blocked by missing second trainer credentials in this run.

The production stack is healthy on the real domains. Resend domain verification for `trener-app.com` is complete according to operator input, and `RESEND_API_KEY` is present on the VPS only. The production guard still rejects `EMAIL_SENDER=console`. Yandex ID and VK ID remain disabled because production client credentials are not present.

## VPS State

```txt
Host: 89.124.106.23
Deploy path: /opt/trainer-app
API: https://api.trener-app.com
Admin: https://admin.trener-app.com
Compose config: passed
Containers: api/admin/postgres/redis healthy; caddy/backup running
Email provider: Resend
```

Verified after deploy:

```txt
GET https://api.trener-app.com/health: 200
GET https://api.trener-app.com/ready: 200
GET https://api.trener-app.com/auth/providers: {"email":true,"yandex":false,"vk":false}
HEAD https://admin.trener-app.com/admin/: 200
```

## Email Delivery

Code changes deployed:

```txt
EMAIL_SENDER=resend is supported as a production email provider.
RESEND_API_KEY is read from backend env only.
EMAIL_FROM=auth@trener-app.com.
EMAIL_FROM_NAME=Trener.
Email subject is "Код для входа в Trener".
Email text/html includes the login code and 5 minute expiry copy.
Console email remains blocked in NODE_ENV=production.
Console code logging remains disabled in production.
```

VPS `.env.production` verified state:

```txt
EMAIL_SENDER=resend
EMAIL_FROM=auth@trener-app.com
EMAIL_FROM_NAME=Trener
RESEND_API_KEY=present, value not printed
SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_SECURE/SMTP_FROM absent
YANDEX_AUTH_ENABLED=false
VK_AUTH_ENABLED=false
```

Previous blocker:

```txt
SMTP_HOST=127.0.0.1 and SMTP_PORT=1025 were smoke-only settings and must not be used for production email.
```

Completed email smoke:

```txt
POST /auth/email/start to real Yandex inbox hram-97@...: passed, 200, ok true
Email delivery to inbox: passed by operator-provided delivered code
POST /auth/email/verify with delivered code: passed, 200
GET /me with returned access token: passed, 200, email provider attached
POST /auth/refresh: passed, 200, returned rotated access/refresh tokens
Reuse old refresh token: passed, 401 invalid_refresh_token
POST /auth/logout with active refresh token: passed, 200
Refresh after logout: passed, 401 invalid_refresh_token
```

## Yandex ID

Official Yandex ID docs were checked on 2026-07-05:

```txt
Yandex ID OAuth app registration is required.
Backend callback must be https://api.trener-app.com/auth/oauth/yandex/callback.
Current backend flow already keeps client secret and provider token on the backend, uses state + PKCE, and returns only a one-time app login ticket to mobile.
```

Current blocker:

```txt
YANDEX_AUTH_ENABLED=false
YANDEX_CLIENT_ID missing
YANDEX_CLIENT_SECRET missing
Yandex end-to-end smoke not run
```

## VK ID

Official VK ID docs were checked on 2026-07-05. The old `auth-code-flow` URL from planning notes now returns not found; the current VK ID documentation menu exposes the "Авторизация без SDK" pages for Web/iOS/Android and API reference pages. VK ID should not be enabled until the exact production app flow and required params are confirmed against the current VK console.

Current blocker:

```txt
VK_AUTH_ENABLED=false
VK_CLIENT_ID missing
VK_CLIENT_SECRET missing
VK end-to-end smoke not run
```

## Mobile Smoke

Backend email login now works against production. iOS Simulator mobile smoke was run on 2026-07-08 with the installed dev client on iPhone 17.

Requested production mobile base URL:

```txt
EXPO_PUBLIC_API_BASE_URL=https://api.trener-app.com
```

Exact-domain simulator attempt:

```txt
The app attempted https://api.trener-app.com/auth/email/start directly.
iOS Simulator DNS failed with NSURLErrorDomain -1003 / DNS Error: NoSuchRecord.
macOS host curl to https://api.trener-app.com/health worked.
The smoke continued through a local simulator-only HTTP bridge on 127.0.0.1:3009 that proxied to https://api.trener-app.com.
This is a smoke workaround, not the final exact-domain mobile pass.
The bridge logged only method/path/status/timing; request/response bodies, email codes, tokens, and secrets were not logged.
```

Local bridge fix applied during smoke:

```txt
Initial proxy forwarded content-encoding from the production response while Node fetch returned a decoded body.
The mobile app treated the successful /auth/email/verify response as a network failure.
Proxy was corrected to strip content-encoding and set the decoded content-length.
After that, /auth/email/verify returned 200 and the app entered the authenticated tabs.
```

Completed mobile smoke evidence:

```txt
iOS dev client launched on iPhone 17 simulator: passed
Mobile email login with real inbox hram-97@...: passed
POST /auth/email/verify through mobile path: 200
GET /sync/bootstrap after login: 200
Created client in mobile UI: passed
POST /clients: 200
Created exercise in mobile UI: passed
POST /exercises: 200
Created workout/session in mobile UI: passed
POST /workout-sessions: 200
Started workout session in mobile UI: passed
POST /workout-sessions/3e1d146a-39d2-4f2b-8f15-6a761cd7cbbd/start: 200
Entered set result values in mobile UI: partially passed
PATCH /workout-sessions/3e1d146a-39d2-4f2b-8f15-6a761cd7cbbd/results: 200
Completed workout in mobile UI: passed
POST /workout-sessions/3e1d146a-39d2-4f2b-8f15-6a761cd7cbbd/complete: 200
Cold app restart with persisted auth: passed
POST /auth/refresh after restart: 200
GET /me after restart: 200
GET /sync/bootstrap after restart: 200
Created client was visible again in the mobile clients tab after restart.
```

Production PostgreSQL verification:

```txt
clients latest row: eeb25fa3-b47f-45cb-ab6c-7c70017177ea | Пщфд03 Ф 0708 | 2026-07-08 20:49:59.546 UTC
exercises latest row: d0db9291-8006-4305-9958-8f8cdb7e0e3c | Smoke0708 | 2026-07-08 20:52:25.973 UTC
workout_sessions latest row: 3e1d146a-39d2-4f2b-8f15-6a761cd7cbbd | COMPLETED | Новая тренировка | started 2026-07-08 20:53:27.477 UTC | finished 2026-07-08 20:55:56.933 UTC
workout_set_results for latest session:
  set 1 | weight 50 | reps null | completed false
  set 1 | weight 5 | reps 10 | completed false
```

## System Exercise Library

Root cause for the production exercise picker showing only `Smoke0708`: backend exercise scoping already supports `system + current trainer`, but production PostgreSQL had only trainer-created exercise rows because the old 200+ built-in catalog still lived in local mock seed data.

Fix added:

```txt
source files: src/data/mockExercises.ts, src/data/exerciseCatalog.ts
seed command: npm run api:seed:exercises
backend idempotency key: exercises.system_key = local:<catalog exercise id>
scope behavior: /exercises and /sync/bootstrap return is_system=true rows plus current trainer rows
restrictions: normal trainer PATCH/DELETE is forbidden for system exercises
```

Production deployment still needs the operator step:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npx prisma migrate deploy --schema server/prisma/schema.prisma
sudo docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npm run api:seed:exercises
```

Then verify:

```sql
select count(*) from exercises where is_system = true and deleted_at is null;
select count(*) from exercises where trainer_id is not null and deleted_at is null;
```

Production deploy completed on 2026-07-09:

```txt
Deploy path: /opt/trainer-app
Secret handling: .env.production and Resend/API secrets were not copied or printed.
API image rebuild: passed.
Prisma migration: 0004_system_exercise_seed_key applied.
Seed run 1: 281 total, 281 created, 0 updated.
Seed run 2: 281 total, 0 created, 281 updated.
Health: GET https://api.trener-app.com/health -> 200
Ready: GET https://api.trener-app.com/ready -> 200
Providers: {"email":true,"yandex":false,"vk":false}
```

Production PostgreSQL counts after seed:

```txt
system exercises: 281
trainer custom exercises: 3
Smoke0708: present
```

Production API verification with a short-lived server-generated smoke access token for the `Smoke0708` trainer:

```txt
GET /me: 200
GET /exercises: 200
/exercises total: 282
/exercises system: 281
/exercises custom for this trainer: 1
/exercises has Smoke0708: true
/exercises matches system + mine: true
GET /sync/bootstrap: 200
/sync/bootstrap exercises total: 282
/sync/bootstrap system: 281
/sync/bootstrap custom for this trainer: 1
/sync/bootstrap has Smoke0708: true
/sync/bootstrap matches system + mine: true
```

The API verification also confirms other trainers' custom exercises are excluded for this trainer: production DB has 3 trainer-owned custom exercises total, while this trainer receives only their 1 custom exercise plus the 281 shared system exercises.

Mobile result caveat:

```txt
The API persisted set result rows, but the mobile summary screen showed 0 of 1 exercises and 0 kg because the set completed flag remained false.
This is a product/UI smoke issue to fix or retest; backend persistence itself was verified.
Simulator keyboard layout also caused one client name typed from automation to become "Пщфд03 Ф 0708" instead of the intended Latin smoke name.
```

Not completed in this run:

```txt
Trainer isolation through two real mobile sessions; a second trainer email/code was not available in this run.
Logout and repeat mobile login/cache isolation for a second user; blocked on second trainer credentials.
Yandex mobile OAuth smoke.
VK mobile OAuth smoke.
```

## Admin Verification

Admin HTTPS availability was rechecked:

```txt
https://admin.trener-app.com/admin/: 200
```

Production PostgreSQL `admin_users` was checked on 2026-07-09. Only allowed fields were printed:

```txt
smoke-admin@admin.89.124.106.23.sslip.io | OWNER | active
hardening-admin@admin.trener-app.com | OWNER | active
```

Admin owner password reset was completed for:

```txt
hardening-admin@admin.trener-app.com | OWNER | active
```

The reset used the same bcrypt cost as the backend admin service. Existing active admin sessions for that owner were revoked. No password hash, token, env secret, or password value was printed, committed, or written to this report.

Login verification passed:

```txt
POST https://api.trener-app.com/admin/auth/login: 200
GET https://api.trener-app.com/admin/auth/me: 200
Admin panel UI login at https://admin.trener-app.com/admin/: passed
Dashboard opened at /admin/dashboard as hardening-admin@admin.trener-app.com with role OWNER
```

The temporary admin session created by verification was revoked after the login checks.

## Checks

Local checks passed:

```txt
npm run api:test: passed, 3 files / 19 tests
npm run api:typecheck: passed
npm run typecheck: passed
npm run admin:build: passed
```

VPS checks passed:

```txt
docker compose config: passed
docker compose up -d --build: passed with sudo
containers healthy/running after deploy
/health and /ready OK over trusted HTTPS
production env cleanup: passed; smoke SMTP values removed
api logs tail check: no RESEND_API_KEY, email code, access token, refresh token, or ticket observed
```

## Secrets

No real secrets were committed. Production `.env.production` remains on the VPS only. Reports and docs use placeholders or presence/missing status only. The reset admin password value was not written to this report; it was stored locally in the macOS Keychain item `trainer-app production admin owner`.

## Remaining Blockers

```txt
1. Fix or bypass iOS Simulator DNS for exact `EXPO_PUBLIC_API_BASE_URL=https://api.trener-app.com` mobile smoke without the local proxy workaround.
2. Trainer isolation through real mobile sessions requires a second trainer email inbox and login code.
3. Retest set completion UX: production API saved result rows, but completed flags stayed false and the summary showed 0 kg.
4. Add production Yandex ID client id/secret, keep backend callback URL exact, enable Yandex, then rerun Yandex smoke.
5. Add production VK ID client id/secret after confirming the current VK ID no-SDK flow, enable VK, then rerun VK smoke.
6. Offsite backups remain a production blocker from Goal 01D.
```
