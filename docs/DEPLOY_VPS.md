# VPS Deploy

## Requirements

- Ubuntu 22.04+ or similar Linux VPS.
- Docker and Docker Compose plugin.
- Domain pointing to the VPS.
- At least 2 GB RAM for API, PostgreSQL, Redis, Caddy, and backups.

Verify the host before deploy:

```bash
uname -a
lsb_release -a || cat /etc/os-release
docker --version
docker compose version
git --version
curl --version
openssl version
ufw status || true
```

If Docker is missing on Ubuntu, install Docker Engine and the Compose v2 plugin from Docker's apt repository:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
docker compose version
```

Use `docker compose`, not legacy `docker-compose`. If the VPS uses Ubuntu's packaged Docker instead of Docker's apt repository, the Compose v2 package may be named:

```bash
sudo apt-get install -y docker-compose-v2
docker compose version
```

If the VPS only has Compose v1, install Compose v2 before continuing.

## Files

- `docker-compose.prod.yml`
- `server/Dockerfile`
- `deploy/Caddyfile`
- `.env.production.example`
- `deploy/scripts/backup-postgres.sh`

## Environment

Create `.env.production` from `.env.production.example` and replace every secret.

Important values:

```txt
NODE_ENV=production
DATABASE_URL=postgresql://trainer_app:<password>@postgres:5432/trainer_app
POSTGRES_PASSWORD=<same password>
JWT_ACCESS_SECRET=<long random secret>
REFRESH_TOKEN_PEPPER=<long random secret>
EMAIL_CODE_PEPPER=<long random secret>
LOGIN_TICKET_PEPPER=<long random secret>
OAUTH_STATE_ENCRYPTION_SECRET=<long random secret>
ADMIN_SESSION_PEPPER=<long random secret>
EMAIL_SENDER=resend
RESEND_API_KEY=<resend api key>
EMAIL_FROM=auth@trener-app.com
EMAIL_FROM_NAME=Trener
```

Production startup refuses unsafe auth secrets and missing `DATABASE_URL`.

`API_BASE_URL` is the public API URL used by auth/OAuth flows. If an operator uses the name `API_PUBLIC_URL` in external notes or hosting panels, map it to `API_BASE_URL` in this project.

Secrets and peppers:

- access JWT secret: `JWT_ACCESS_SECRET`;
- refresh token hash pepper: `REFRESH_TOKEN_PEPPER` (`JWT_REFRESH_SECRET` is accepted as a fallback by config);
- email code hash pepper: `EMAIL_CODE_PEPPER`;
- login ticket pepper: `LOGIN_TICKET_PEPPER`;
- OAuth state pepper/encryption: `OAUTH_STATE_PEPPER`, `OAUTH_STATE_ENCRYPTION_SECRET`;
- admin session cookie signing/lookup pepper: `ADMIN_SESSION_PEPPER`.

There is no separate `ADMIN_COOKIE_SECRET` or `CSRF_SECRET` variable in the current implementation. Admin sessions use `ADMIN_SESSION_PEPPER`; state-changing admin requests use the issued CSRF token and `ADMIN_CSRF_COOKIE_NAME`.

Production flags:

```txt
NODE_ENV=production
AUTH_ENABLED=true
EMAIL_AUTH_ENABLED=true
YANDEX_AUTH_ENABLED=false
VK_AUTH_ENABLED=false
ADMIN_ENABLED=true
```

Mobile/admin public URLs:

```txt
EXPO_PUBLIC_API_BASE_URL=https://api.example.com
API_BASE_URL=https://api.example.com
PUBLIC_API_URL=https://api.example.com
CORS_ORIGINS=https://api.example.com
ADMIN_CORS_ORIGIN=https://admin.example.com
ADMIN_PUBLIC_URL=https://admin.example.com
ADMIN_WEB_ORIGIN=https://admin.example.com
VITE_ADMIN_API_BASE_URL=https://api.example.com
```

Do not enable console/mock email delivery in production. For the current production setup, use `EMAIL_SENDER=resend` with `RESEND_API_KEY` set only in VPS `.env.production`.

Before production email smoke, verify the Resend sender domain DNS records: SPF, DKIM, MX, DMARC, and Return-Path/bounce handling required by Resend. Do not keep smoke SMTP settings such as `SMTP_HOST=127.0.0.1` in production when Resend is active. The first mobile release is email-only: keep `YANDEX_AUTH_ENABLED=false` and `VK_AUTH_ENABLED=false`; provider credentials and redirect URIs are not required. The dormant backend OAuth settings may remain documented for a future, separately reviewed rollout.

## Start

Validate compose before starting:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Use Docker Compose v2 (`docker compose`). If the VPS only has legacy `docker-compose` v1, install the Docker Compose plugin before deploy.

On the current VPS, the `deploy` user has passwordless sudo but is not using the Docker socket directly in non-interactive SSH sessions. Prefix Docker commands with `sudo` unless the user is later added to the Docker group and the session is refreshed.

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
sudo docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Apply Prisma migrations:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npx prisma migrate deploy --schema server/prisma/schema.prisma
```

Seed the shared system exercise library after migrations:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npm run api:seed:exercises
```

The seed is idempotent and should report roughly 200+ total system exercises. Confirm production counts:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) filter (where is_system = true and deleted_at is null) as system_exercises, count(*) filter (where trainer_id is not null and deleted_at is null) as trainer_exercises from exercises;"'
```

Check health:

```bash
curl http://localhost/health
curl http://localhost/ready
curl http://localhost/auth/providers
```

`/health` verifies the process is alive. `/ready` verifies the API can reach its backing data repository.

Data sync endpoints are auth-required except `/ready`. Mobile data writes use bearer tokens and the API derives `trainer_id` from the token, not from request bodies.

Production startup checklist:

```txt
1. `docker compose ... config` succeeds.
2. `api`, `admin`, `postgres`, `redis`, and Caddy reverse proxy containers are healthy/running.
3. Prisma migrations have run.
4. `/health` returns OK and no secrets.
5. `/ready` returns OK after DB/Redis dependencies are available.
6. Admin owner can log in over HTTPS.
7. Mobile production API base URL reaches the same API from device/simulator.
8. `/auth/providers` reports Yandex/VK disabled, and their start/callback endpoints return `403 provider_disabled`.
9. Production logs do not include access tokens, refresh tokens, provider tokens, email codes, or full auth request bodies.
10. `EMAIL_SENDER=resend`; console/mock auth and smoke SMTP are not used for production login.
```

## Caddy And HTTPS

Production compose uses Caddy (`deploy/Caddyfile`) as the public reverse proxy. Caddy listens on ports 80 and 443, redirects HTTP to HTTPS, and obtains Let's Encrypt certificates automatically.

DNS must point directly at the VPS with Cloudflare Proxy disabled / DNS only while issuing certificates:

```txt
api.trener-app.com -> <VPS IP>
admin.trener-app.com -> <VPS IP>
```

Check ports before deploy:

```bash
sudo ss -tulpn | grep -E ':(80|443)'
sudo ufw status
```

After deploy, confirm trusted HTTPS without `-k`:

```bash
curl -I https://api.trener-app.com/health
curl -I https://api.trener-app.com/ready
curl -I https://admin.trener-app.com/admin/
```

Caddy certificate evidence can be checked with:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=120 caddy
echo | openssl s_client -servername api.trener-app.com -connect api.trener-app.com:443 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
```

## Backups

The compose file includes a daily `pg_dump` job:

```txt
deploy/backups/trainer_app_<timestamp>.sql.gz
```

Local VPS backups are not enough for production. Sync these dumps to external storage such as S3, Backblaze, another server, or encrypted object storage.

If operations require backups under `/opt/trainer-app/backups`, either update the compose bind mount to that path or make `deploy/backups` a symlink to `/opt/trainer-app/backups` before starting the backup service. Confirm with:

```bash
ls -lh /opt/trainer-app/backups
```

Manual backup:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backup /usr/local/bin/backup-postgres.sh
```

Check that a backup file exists:

```bash
ls -lh deploy/backups/trainer_app_*.sql.gz
```

Restore into a temporary local/test database first:

```bash
createdb trainer_app_restore_check
gunzip -c deploy/backups/trainer_app_<timestamp>.sql.gz \
  | psql postgresql://trainer_app:<password>@localhost:5432/trainer_app_restore_check
psql postgresql://trainer_app:<password>@localhost:5432/trainer_app_restore_check \
  -c 'select count(*) from users; select count(*) from clients; select count(*) from workout_sessions;'
dropdb trainer_app_restore_check
```

Restore into the compose PostgreSQL container:

```bash
gunzip -c deploy/backups/trainer_app_<timestamp>.sql.gz \
  | docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
      sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

For a destructive production restore, stop the API first, verify the target database name, restore, run a read-only sanity check, then start the API again:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml stop api
gunzip -c deploy/backups/trainer_app_<timestamp>.sql.gz \
  | docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
      sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose --env-file .env.production -f docker-compose.prod.yml start api
curl http://localhost/ready
```

Backup safety:

- dumps may contain refresh token hashes and trainer/client business data;
- store production backups encrypted or in protected external storage;
- do not rely on the same VPS as the only copy;
- default local retention is `BACKUP_RETENTION_DAYS=7`; production should keep at least daily backups for 7 days and weekly/monthly copies according to business requirements.

## Restore Drill

Run restore checks only against an isolated temporary database/container unless you are intentionally performing a destructive production restore.

Inside the compose network:

```bash
BACKUP_FILE=deploy/backups/trainer_app_<timestamp>.sql.gz
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  sh -lc 'createdb -U "$POSTGRES_USER" trainer_app_restore_check'
gunzip -c "$BACKUP_FILE" \
  | docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
      sh -lc 'psql -U "$POSTGRES_USER" -d trainer_app_restore_check'
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d trainer_app_restore_check -c "select count(*) from users; select count(*) from auth_identities; select count(*) from clients; select count(*) from exercises; select count(*) from workout_templates; select count(*) from workout_sessions; select count(*) from workout_set_results; select count(*) from admin_users; select count(*) from admin_audit_logs;"'
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  sh -lc 'dropdb -U "$POSTGRES_USER" trainer_app_restore_check'
```

Compare these counts with production counts captured immediately before backup. Do not keep the restore-check database after the drill.

## Update

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build api
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npx prisma migrate deploy --schema server/prisma/schema.prisma
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
curl -I https://api.trener-app.com/ready
```

PostgreSQL data lives in the `postgres_data` Docker volume and is not removed by image rebuilds.

## Post-Deploy Smoke

Run after a fresh deploy or restore:

```txt
1. Sign in on mobile as trainer A.
2. Create a client, exercise, planned workout, session result, and completed session.
3. Restart mobile and confirm `/sync/bootstrap` restores the data.
4. Sign in as trainer B and confirm trainer A's data is not visible.
5. Open admin trainer detail and confirm client/session metrics reflect mobile-created data.
6. Block trainer A in admin and confirm mobile refresh/me/login is rejected.
7. Unblock trainer A and confirm login works again.
8. Run a manual backup.
9. Restore the backup into a temporary database and verify users/clients/workout_sessions/workout_set_results counts.
```

## Goal 01D Production Gate Checklist

Record every item as `passed`, `failed`, or `skipped with reason`.

```txt
VPS host / OS:
Docker / Compose:
Domains:
Containers:
Prisma migrate status:
/health:
/ready:
/auth/providers:
Auth email start/verify/me/refresh/logout:
Admin login/logout/me/dashboard/trainers/security/audit/system health:
Mobile trainer A create client/exercise/workout/session/results:
Admin sees mobile-created trainer data:
Trainer A/B isolation:
Mutation error does not create fake cache success:
Active/completed session guard:
Soft delete bootstrap:
Blocked trainer behavior:
Backup file:
Restore drill:
Logs checked for tokens/secrets/codes:
HTTPS / Secure / HttpOnly / SameSite:
Skipped:
Production TODO:
```

Useful evidence commands, with secrets removed from shared output:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 api
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 admin
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 postgres
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 redis
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 caddy
docker compose --env-file .env.production -f docker-compose.prod.yml exec api \
  npx prisma migrate status --schema server/prisma/schema.prisma
curl -i https://api.example.com/health
curl -i https://api.example.com/ready
curl -i https://api.example.com/auth/providers
```
