#!/usr/bin/env bash

set -Eeuo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$REPO_ROOT/deploy/docker-compose.release.yml"
ENV_EXAMPLE="$REPO_ROOT/.env.production.example"
RUNBOOK="$REPO_ROOT/deploy/runbooks/production-release.md"
WORKFLOW="$REPO_ROOT/.github/workflows/release-readiness.yml"
POSTGRES_RUNNER="$REPO_ROOT/scripts/run-postgres-integration.mjs"
ADMIN_NGINX="$REPO_ROOT/admin/nginx.conf"

fail() {
  printf 'release ops config test failed: %s\n' "$1" >&2
  exit 1
}

for shell_file in \
  "$REPO_ROOT/deploy/scripts/backup-postgres.sh" \
  "$REPO_ROOT/deploy/scripts/restore-drill.sh" \
  "$REPO_ROOT/deploy/scripts/production-preflight.sh" \
  "$REPO_ROOT/deploy/scripts/lib/postgres-guards.sh" \
  "$REPO_ROOT/scripts/test-backup-postgres.sh" \
  "$REPO_ROOT/scripts/test-postgres-guards.sh"; do
  bash -n "$shell_file" || fail "bash syntax check failed: $shell_file"
done

bash -n "$REPO_ROOT/scripts/fixtures/preflight-bin/psql" || fail "preflight fixture has invalid bash syntax"

for required_file in "$COMPOSE" "$ENV_EXAMPLE" "$RUNBOOK" "$WORKFLOW" "$ADMIN_NGINX"; do
  [[ -f "$required_file" ]] || fail "required file is missing: $required_file"
done

grep -q '^  migrate:$' "$COMPOSE" || fail "migration job is absent"
grep -q '^  seed:$' "$COMPOSE" || fail "seed job is absent"
grep -q '^  preflight:$' "$COMPOSE" || fail "preflight job is absent"
grep -q 'condition: service_completed_successfully' "$COMPOSE" || fail "one-shot completion ordering is absent"
grep -q 'api-schema-readiness.mjs' "$COMPOSE" || fail "schema-aware API healthcheck is absent"
grep -q '^  caddy:$' "$COMPOSE" || fail "Caddy release ordering is absent"
grep -q 'RELEASE_IMAGE_TAG:?set RELEASE_IMAGE_TAG' "$COMPOSE" || fail "immutable release tag is not fail-closed"
grep -q 'VITE_ADMIN_API_BASE_URL:?set VITE_ADMIN_API_BASE_URL' "$REPO_ROOT/docker-compose.prod.yml" \
  || fail "admin production API origin is not fail-closed"
grep -q '^[[:space:]]*absolute_redirect off;' "$ADMIN_NGINX" \
  || fail "admin root redirect may downgrade HTTPS behind Caddy"
grep -q '^[[:space:]]*return 302 /admin/dashboard;' "$ADMIN_NGINX" \
  || fail "admin root redirect must remain origin-relative"
if grep -R -E 'TEST_DATABASE_URL="?\$\{?DATABASE_URL|TEST_DATABASE_URL=.*DATABASE_URL' \
  "$REPO_ROOT/deploy/scripts" "$REPO_ROOT/.github/workflows" >/dev/null; then
  fail "TEST_DATABASE_URL falls back to DATABASE_URL"
fi
if env -i \
  PATH="$PATH" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test \
  DATABASE_URL=postgresql://fixture:secret@unrelated.example:5432/unrelated_database \
  node "$POSTGRES_RUNNER" >/dev/null 2>&1; then
  fail "destructive PostgreSQL runner accepted an ambient DATABASE_URL"
fi
if env -i \
  PATH="$PATH" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  PGHOSTADDR=203.0.113.10 \
  TEST_DATABASE_URL=postgresql://fixture:secret@safe.invalid:5432/trainer_disposable_test \
  node "$POSTGRES_RUNNER" >/dev/null 2>&1; then
  fail "destructive PostgreSQL runner accepted an ambient PGHOSTADDR"
fi
if env -i \
  PATH="$PATH" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL='postgresql://fixture:secret@safe.invalid:5432/trainer_disposable_test?hostaddr=203.0.113.10' \
  node "$POSTGRES_RUNNER" >/dev/null 2>&1; then
  fail "destructive PostgreSQL runner accepted a target-changing URI parameter"
fi
grep -q -- '--dbname="$PREFLIGHT_DATABASE_URL"' "$REPO_ROOT/deploy/scripts/production-preflight.sh" \
  || fail "preflight does not pass its explicit connection URI to psql"
grep -q -- '--dbname="$TEST_DATABASE_URL"' "$REPO_ROOT/deploy/scripts/restore-drill.sh" \
  || fail "restore drill does not pass its guarded connection URI to psql"
if grep -R -E 'PGDATABASE="\$(PREFLIGHT_DATABASE_URL|TEST_DATABASE_URL)"' \
  "$REPO_ROOT/deploy/scripts" >/dev/null; then
  fail "a PostgreSQL URI is incorrectly assigned to PGDATABASE"
fi

while IFS= read -r line; do
  case "$line" in
    \#*|'') continue ;;
  esac
  key="${line%%=*}"
  value="${line#*=}"
  case "$key" in
    *PASSWORD*|*SECRET*|*TOKEN*|*DATABASE_URL*|*API_BASE_URL*|*CORS_ORIGIN*|*POLICY_URL*|*SUPPORT_URL*|*REDIRECT_URI*)
      [[ -z "$value" ]] || fail "tracked env example assigns sensitive or release-specific value to $key"
      ;;
  esac
done <"$ENV_EXAMPLE"

grep -q 'ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE' "$RUNBOOK" \
  || fail "restore acknowledgement is not documented"
grep -qi 'deletion receipt' "$RUNBOOK" || fail "deletion receipt replay is not documented"
grep -qi 'backward-compatible' "$RUNBOOK" || fail "backward-compatible rollout rule is not documented"

grep -q 'secrets.EXPO_PUBLIC_API_BASE_URL' "$WORKFLOW" || fail "export API URL is not secret-backed"
grep -q 'secrets.EXPO_PUBLIC_PRIVACY_POLICY_URL' "$WORKFLOW" || fail "privacy URL is not secret-backed"
grep -q 'secrets.EXPO_PUBLIC_SUPPORT_URL' "$WORKFLOW" || fail "support URL is not secret-backed"
grep -q 'npm run test:postgres' "$WORKFLOW" || fail "real PostgreSQL suite is absent from CI"
grep -q '^  native-ios-compile:$' "$WORKFLOW" || fail "native iOS compile job is absent from CI"
grep -q 'runs-on: macos-26' "$WORKFLOW" || fail "native iOS compile must use the Xcode 26 runner"
grep -q 'xcodebuild' "$WORKFLOW" || fail "native iOS compile does not invoke Xcode"
if grep -E 'EXPO_PUBLIC_(API_BASE_URL|PRIVACY_POLICY_URL|SUPPORT_URL):[[:space:]]+https?://' "$WORKFLOW" \
  | grep -Ev 'https://(api|privacy|support)\.invalid$' >/dev/null; then
  fail "workflow hardcodes a release URL"
fi

printf 'release ops configuration tests passed without Docker or database contact\n'
