#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/postgres-guards.sh
source "$SCRIPT_DIR/lib/postgres-guards.sh"

fail() {
  printf 'restore drill failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

assert_disposable_test_database || exit 1

BACKUP_FILE="${BACKUP_FILE:?BACKUP_FILE is required}"
RESTORE_FORMAT="${RESTORE_FORMAT:-auto}"
[[ -f "$BACKUP_FILE" ]] || fail "BACKUP_FILE does not exist"

require_command gzip
require_command psql
gzip -t -- "$BACKUP_FILE" || fail "backup gzip integrity validation failed"

if [[ "$RESTORE_FORMAT" == "auto" ]]; then
  case "$BACKUP_FILE" in
    *.dump.gz) RESTORE_FORMAT="custom" ;;
    *.sql.gz) RESTORE_FORMAT="plain" ;;
    *) fail "cannot infer restore format; set RESTORE_FORMAT=plain or custom" ;;
  esac
fi
[[ "$RESTORE_FORMAT" == "plain" || "$RESTORE_FORMAT" == "custom" ]] || fail "RESTORE_FORMAT must be plain or custom"

printf 'resetting approved disposable restore target\n'
if ! psql --dbname="$TEST_DATABASE_URL" -X --no-psqlrc --quiet --set=ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL
then
  fail "could not reset the approved disposable target"
fi

if [[ "$RESTORE_FORMAT" == "plain" ]]; then
  if ! gzip -cd -- "$BACKUP_FILE" 2>/dev/null \
    | psql --dbname="$TEST_DATABASE_URL" -X --no-psqlrc --quiet --set=ON_ERROR_STOP=1 >/dev/null 2>&1; then
    fail "plain-format restore returned a non-zero exit status"
  fi
else
  require_command pg_restore
  restore_tmp="$(mktemp "${TMPDIR:-/tmp}/trainer-restore.XXXXXX")"
  trap 'rm -f -- "$restore_tmp"' EXIT INT TERM
  gzip -cd -- "$BACKUP_FILE" >"$restore_tmp" || fail "could not decompress custom-format backup"
  pg_restore --list "$restore_tmp" >/dev/null || fail "pg_restore could not list custom-format backup"
  if ! pg_restore --no-owner --no-privileges "$restore_tmp" 2>/dev/null \
    | psql --dbname="$TEST_DATABASE_URL" -X --no-psqlrc --quiet --set=ON_ERROR_STOP=1 >/dev/null 2>&1; then
    fail "custom-format restore returned a non-zero exit status"
  fi
fi

validation="$({
  PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30000' \
    psql --dbname="$TEST_DATABASE_URL" -X --no-psqlrc -A -t --set=ON_ERROR_STOP=1 <<'SQL'
BEGIN TRANSACTION READ ONLY;
SELECT CASE
  WHEN to_regclass('public.users') IS NOT NULL
   AND to_regclass('public.exercises') IS NOT NULL
   AND to_regclass('public.workout_sessions') IS NOT NULL
  THEN 'ok' ELSE 'missing-core-schema' END;
COMMIT;
SQL
} )" || fail "read-only post-restore validation failed"

grep -q '^ok$' <<<"$validation" || fail "restored backup is missing the core schema"
printf 'restore drill complete: host=%s port=%s database=%s\n' "$PG_GUARD_HOST" "$PG_GUARD_PORT" "$PG_GUARD_DATABASE"
