# Auth

The trainer app is auth-first. Without a valid session, only the email sign-in and verification routes are available.

The first mobile release is email-only. VK ID and Yandex ID are not present in the production UI, route graph, deep-link handling, or mobile API client. The backend OAuth broker remains isolated for a possible later release, but both providers are disabled by default in production and every provider entry point fails closed while disabled.

## Architecture

Mobile talks to the backend in `server/src`. Provider client secrets never enter the Expo bundle.

Email login:

1. Mobile calls `POST /auth/email/start`.
2. Backend stores only a hashed 6-digit code and sends the code through `EmailSender`.
3. Mobile calls `POST /auth/email/verify`.
4. Backend creates or finds the user, creates the `email` identity, issues a short-lived access token and an opaque refresh token.

Dormant OAuth broker flow (not reachable from the first-release mobile client):

1. A future mobile client opens `GET /auth/oauth/:provider/start?return_to=app`.
2. Backend creates hashed `state`, encrypted PKCE verifier, and redirects to Yandex ID or VK ID.
3. Provider redirects to backend callback.
4. Backend exchanges the code using the provider client secret, normalizes the profile, creates a one-time login ticket, and redirects to `trainer://auth/callback?ticket=...&provider=...`.
5. A future authorized client could call `POST /auth/ticket/exchange` and receive a normal app session.

The custom `trainer` scheme remains registered in `app.json` for Expo Router/native URL registration. There is no `auth/callback` route or global auth-link listener in the first-release client, so the scheme does not expose or restore social login.

Refresh flow:

1. Mobile stores refresh tokens through `expo-secure-store`.
2. Backend stores refresh tokens only as HMAC hashes.
3. `POST /auth/refresh` rotates the refresh token on every call.
4. Reuse of an already-rotated/revoked token revokes that device token family.

## Backend Endpoints

- `GET /health`
- `GET /auth/providers`
- `POST /auth/email/start`
- `POST /auth/email/verify`
- `GET /auth/oauth/:provider/start` (retained, returns `403 provider_disabled` while disabled)
- `GET /auth/oauth/:provider/callback` (retained, returns `403 provider_disabled` while disabled)
- `POST /auth/ticket/exchange` (retained, rejects tickets for a disabled provider)
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`

Errors use `{ "code": "...", "message": "..." }`. Mobile treats unknown codes as `unknown`.

## Data Model

Prisma schema and migration live in:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/0001_init/migration.sql`

Tables:

- `users`
- `auth_identities`
- `refresh_tokens`
- `email_login_codes`
- `oauth_states`
- `login_tickets`

Hash-only storage:

- Refresh token hash: `refresh_tokens.token_hash`
- Email code hash: `email_login_codes.code_hash`
- OAuth state hash: `oauth_states.state_hash`
- Login ticket hash: `login_tickets.ticket_hash`

## Local Backend

For fast local testing without Postgres, omit `DATABASE_URL`; the API uses an in-memory repository. For production-like local DB testing, set `DATABASE_URL` and run Prisma migrations.

```bash
npm run api:prisma:generate
npm run api:migrate
npm run api:dev
```

Useful checks:

```bash
npm run api:typecheck
npm run api:test
curl http://localhost:3000/health
curl http://localhost:3000/auth/providers
```

## Mobile Against Backend

Set:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_USE_MOCK_AUTH=false
```

Then start the app and run it on iOS Simulator:

```bash
npm run api:dev
npm run ios
```

If the iOS simulator cannot reach `localhost`, use the Mac LAN IP in `EXPO_PUBLIC_API_BASE_URL`.

## Mock Auth

Mock auth is development-only.

- Mobile config: `src/auth/config.ts`
- Mock implementation: `src/auth/api/authApi.ts`
- Mock code: `111111`

Production disables mock even if `EXPO_PUBLIC_USE_MOCK_AUTH=true`. If production has no `EXPO_PUBLIC_API_BASE_URL`, mobile returns a configuration error instead of silently using mock.

## Dormant Provider Setup

No provider credentials or redirect registration are required for the email-only first release. Keep `YANDEX_AUTH_ENABLED=false` and `VK_AUTH_ENABLED=false` in production. The details below document the isolated backend implementation for a future, separately reviewed rollout.

Historical mobile callback URI used by the dormant broker design:

```txt
trainer://auth/callback
```

Provider console redirect URIs point to backend callbacks, not the mobile app:

```txt
http://localhost:3000/auth/oauth/yandex/callback
http://localhost:3000/auth/oauth/vk/callback
```

For a future social-auth rollout, production redirect URIs must use the production backend host.

Current production callback URIs:

```txt
https://api.trener-app.com/auth/oauth/yandex/callback
https://api.trener-app.com/auth/oauth/vk/callback
```

Yandex defaults:

- Authorization: `https://oauth.yandex.ru/authorize`
- Token: `https://oauth.yandex.ru/token`
- Profile: `https://login.yandex.ru/info`
- Scopes: `login:email login:info login:avatar`

VK ID defaults are configurable because VK ID flow details can change:

- Authorization: `VK_AUTHORIZATION_URL`
- Token: `VK_TOKEN_URL`
- Profile: `VK_PROFILE_URL`
- Scopes: `VK_SCOPES`

Verify the current VK ID console/docs before a future social-auth rollout and set these env values explicitly.

## Production Email Delivery

Production must use a real email provider. `EMAIL_SENDER=console` is rejected when `NODE_ENV=production`, and the console sender never logs login codes in production.

Current production email provider is Resend. Required env lives only in the VPS `.env.production`:

```env
EMAIL_SENDER=resend
RESEND_API_KEY=replace_me
EMAIL_FROM=auth@trener-app.com
EMAIL_FROM_NAME=Trener
EMAIL_CODE_TTL_SECONDS=300
EMAIL_CODE_RESEND_SECONDS=60
EMAIL_CODE_LENGTH=6
```

Before enabling email login for launch, add and verify the sender DNS records required by the mail provider: SPF, DKIM, DMARC, and any Return-Path/bounce domain records. Do not keep smoke SMTP settings such as `SMTP_HOST=127.0.0.1` in production when `EMAIL_SENDER=resend` is active.

## Manual Test Recipes

Email:

1. Start backend with `EMAIL_SENDER=console`.
2. Open the app on iOS Simulator.
3. Enter email.
4. Read the code from backend logs.
5. Verify sign-in reaches the protected app.

Disabled Yandex/VK guards:

1. Start the backend in production mode without social-auth flags.
2. Confirm `/auth/providers` reports `yandex: false` and `vk: false`.
3. Confirm both provider start endpoints return `403 provider_disabled`.
4. Confirm both provider callback endpoints return `403 provider_disabled`, including cancellation/error callbacks.
5. Confirm a ticket issued before a provider is disabled cannot be exchanged afterward.

Refresh rotation:

1. Sign in.
2. Call `POST /auth/refresh` with the current refresh token.
3. Confirm response contains a new refresh token.
4. Reuse the old token and confirm `invalid_refresh_token`.

Logout:

1. Sign in.
2. Tap logout.
3. Confirm backend receives `POST /auth/logout`.
4. Confirm local secure tokens are cleared and app returns to sign-in.

## Production Checklist

- [ ] `DATABASE_URL` is set.
- [ ] `JWT_ACCESS_SECRET` is replaced.
- [ ] `REFRESH_TOKEN_PEPPER` is replaced.
- [ ] `EMAIL_CODE_PEPPER` is replaced.
- [ ] `LOGIN_TICKET_PEPPER` is replaced.
- [ ] `OAUTH_STATE_ENCRYPTION_SECRET` is replaced.
- [ ] SMTP/provider sender is configured.
- [ ] `YANDEX_AUTH_ENABLED=false` for the first release.
- [ ] `VK_AUTH_ENABLED=false` for the first release.
- [ ] Social provider credentials are absent or retained only as dormant backend secrets; none use `EXPO_PUBLIC_*`.
- [ ] `EXPO_PUBLIC_API_BASE_URL` points to production API.
- [ ] `EXPO_PUBLIC_USE_MOCK_AUTH=false`.
- [ ] HTTPS is enabled.
- [ ] Rate limits are enabled.
- [ ] Logs do not contain tokens, codes, tickets, or provider tokens.
- [ ] Client secrets do not appear in any `EXPO_PUBLIC_*` variable or mobile bundle.

## Production Smoke

Run against the VPS API over HTTPS. Do not paste access tokens, refresh tokens, email codes, or cookies into shared logs.

```txt
1. GET /me without Authorization returns 401.
2. POST /auth/email/start returns a neutral response and does not disclose whether the email already exists.
3. POST /auth/email/verify succeeds with the delivered code.
4. GET /me succeeds with the returned access token.
5. POST /auth/refresh rotates the refresh token.
6. POST /auth/logout revokes the active refresh token.
7. GET /me after logout fails without a valid access token.
8. Reusing the old refresh token after logout fails.
9. Yandex/VK start and callback endpoints return `403 provider_disabled`.
10. A previously issued social login ticket is rejected after that provider is disabled.
```

Database checks:

```txt
refresh_tokens.token_hash is populated; raw refresh tokens are not stored.
email_login_codes.code_hash is populated; raw email codes are not stored.
login_tickets.ticket_hash is populated for OAuth ticket flows; raw tickets are not stored.
```

For Goal 03, Resend must deliver a real email code to pass the gate. If Resend credentials are not ready, mark auth email delivery as skipped with the reason and keep it as a launch blocker.
