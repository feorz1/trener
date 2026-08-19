#!/usr/bin/env bash

set -Eeuo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$REPO_ROOT/deploy/scripts/backup-postgres.sh"
FIXTURE_BIN="$REPO_ROOT/scripts/fixtures/backup-bin"
REAL_GZIP="$(command -v gzip)"
TEST_TMP_BASE="${TMPDIR:-/tmp}"
TEST_TMP_BASE="${TEST_TMP_BASE%/}"
TEST_ROOT="$(mktemp -d "$TEST_TMP_BASE/trainer-backup-test.XXXXXX")"

cleanup() {
  case "$TEST_ROOT" in
    "$TEST_TMP_BASE"/trainer-backup-test.*) rm -rf -- "$TEST_ROOT" ;;
    *) printf 'refusing unsafe test cleanup: %s\n' "$TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

fail() {
  printf 'backup test failed: %s\n' "$1" >&2
  exit 1
}

run_backup() {
  local target_dir="$1"
  shift
  env \
    PATH="$FIXTURE_BIN:$PATH" \
    REAL_GZIP="$REAL_GZIP" \
    POSTGRES_PASSWORD="fixture-only" \
    POSTGRES_HOST="no-database-contact.invalid" \
    POSTGRES_USER="fixture" \
    POSTGRES_DB="fixture" \
    BACKUP_DIR="$target_dir" \
    BACKUP_RETENTION_DAYS=0 \
    "$@" \
    bash "$BACKUP_SCRIPT"
}

assert_no_published_backup() {
  local target_dir="$1"
  if find "$target_dir" -maxdepth 1 -type f \( -name 'trainer_app_*.sql.gz' -o -name 'trainer_app_*.dump.gz' \) | grep -q .; then
    fail "a failed operation published a backup"
  fi
}

for fault in dump gzip corruption; do
  case_dir="$TEST_ROOT/$fault"
  mkdir -p "$case_dir"
  old_backup="$case_dir/trainer_app_20000101T000000Z.sql.gz"
  printf '%s' 'retention-sentinel' >"$old_backup"
  touch -t 200001010000 "$old_backup"

  case "$fault" in
    dump)
      if run_backup "$case_dir" FAKE_PG_DUMP_MODE=fail BACKUP_TIMESTAMP=20260722T010101Z >/dev/null 2>&1; then
        fail "pg_dump fault unexpectedly succeeded"
      fi
      ;;
    gzip)
      if run_backup "$case_dir" FAKE_GZIP_MODE=fail BACKUP_TIMESTAMP=20260722T010102Z >/dev/null 2>&1; then
        fail "gzip fault unexpectedly succeeded"
      fi
      ;;
    corruption)
      if run_backup "$case_dir" FAKE_GZIP_MODE=corrupt BACKUP_TIMESTAMP=20260722T010103Z >/dev/null 2>&1; then
        fail "corrupt gzip stream unexpectedly succeeded"
      fi
      ;;
  esac

  [[ -f "$old_backup" ]] || fail "retention ran after the $fault fault"
  published_count="$(find "$case_dir" -maxdepth 1 -type f -name 'trainer_app_20260722T*.gz' | wc -l | tr -d ' ')"
  [[ "$published_count" == "0" ]] || fail "the $fault fault left a published output"
done

success_dir="$TEST_ROOT/success"
mkdir -p "$success_dir"
old_backup="$success_dir/trainer_app_20000101T000000Z.sql.gz"
printf '%s' 'retention-sentinel' >"$old_backup"
touch -t 200001010000 "$old_backup"
run_backup "$success_dir" BACKUP_TIMESTAMP=20260722T020202Z >/dev/null
plain_backup="$success_dir/trainer_app_20260722T020202Z.sql.gz"
[[ -f "$plain_backup" ]] || fail "validated plain backup was not published"
"$REAL_GZIP" -t "$plain_backup" || fail "published plain backup failed gzip validation"
[[ ! -e "$old_backup" ]] || fail "retention did not run after a successful backup"

custom_dir="$TEST_ROOT/custom"
mkdir -p "$custom_dir"
run_backup "$custom_dir" BACKUP_FORMAT=custom BACKUP_TIMESTAMP=20260722T030303Z >/dev/null
custom_backup="$custom_dir/trainer_app_20260722T030303Z.dump.gz"
[[ -f "$custom_backup" ]] || fail "validated custom backup was not published"
"$REAL_GZIP" -t "$custom_backup" || fail "published custom backup failed gzip validation"

printf 'backup fault-injection tests passed without database contact\n'
