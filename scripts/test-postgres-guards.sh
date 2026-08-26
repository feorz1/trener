#!/usr/bin/env bash

set -Eeuo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
GUARDS="$REPO_ROOT/deploy/scripts/lib/postgres-guards.sh"
PREFLIGHT="$REPO_ROOT/deploy/scripts/production-preflight.sh"
PREFLIGHT_FIXTURE_BIN="$REPO_ROOT/scripts/fixtures/preflight-bin"

fail() {
  printf 'PostgreSQL guard test failed: %s\n' "$1" >&2
  exit 1
}

expect_rejected() {
  local label="$1"
  shift
  if env -i PATH="$PATH" GUARDS="$GUARDS" "$@" bash -c 'source "$GUARDS"; assert_disposable_test_database' >/dev/null 2>&1; then
    fail "$label was accepted"
  fi
}

expect_rejected "production NODE_ENV" \
  NODE_ENV=production \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test

expect_rejected "missing acknowledgement" \
  NODE_ENV=test \
  TEST_DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test

expect_rejected "wrong acknowledgement" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=YES \
  TEST_DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test

expect_rejected "missing TEST_DATABASE_URL" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test

expect_rejected "ambient DATABASE_URL" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test \
  DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_disposable_test

expect_rejected "different ambient DATABASE_URL" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL='postgres://test-user:test-secret@DB.INTERNAL.EXAMPLE/trainer_disposable_test?sslmode=disable' \
  DATABASE_URL=postgresql://production-user:different-secret@unrelated.example:5432/unrelated_database

expect_rejected "non-test database name" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@127.0.0.1:5432/trainer_app

expect_rejected "production domain" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@db.prod.trener-app.com:5432/trainer_disposable_test

expect_rejected "production domain with trailing DNS dot" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@db.trener-app.com.:5432/trainer_disposable_test

expect_rejected "ambiguous IPv6 target" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@[::1]:5432/trainer_disposable_test

expect_rejected "URI hostaddr override" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL='postgresql://fixture:secret@safe.invalid:5432/trainer_disposable_test?hostaddr=203.0.113.10'

expect_rejected "ambient PGHOSTADDR override" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  PGHOSTADDR=203.0.113.10 \
  TEST_DATABASE_URL=postgresql://fixture:secret@safe.invalid:5432/trainer_disposable_test

expect_rejected "production hostname segment" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:secret@db.production.example.net:5432/trainer_disposable_test

expect_rejected "configured production host" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  PRODUCTION_DATABASE_HOSTS=internal.example \
  TEST_DATABASE_URL=postgresql://fixture:secret@db.internal.example:5432/trainer_disposable_test

approved_output="$(env -i PATH="$PATH" GUARDS="$GUARDS" \
  NODE_ENV=test \
  ACCOUNT_DELETION_TEST_DB_ACK=DELETE_DISPOSABLE_DATABASE \
  TEST_DATABASE_URL=postgresql://fixture:do-not-print-me@127.0.0.1:5432/trainer_disposable_test \
  bash -c 'set -u; source "$GUARDS"; assert_disposable_test_database')" || fail "safe disposable URL was rejected under strict shell mode"
grep -q 'host=127.0.0.1 port=5432 database=trainer_disposable_test' <<<"$approved_output" \
  || fail "safe target output was not sanitized as expected"
if grep -q 'do-not-print-me\|fixture@' <<<"$approved_output"; then
  fail "sanitized output leaked URL credentials"
fi

if env -i PATH="$PATH" GUARDS="$GUARDS" bash -c 'source "$GUARDS"; assert_explicit_preflight_database' >/dev/null 2>&1; then
  fail "preflight accepted a missing PREFLIGHT_DATABASE_URL"
fi
preflight_output="$(env -i PATH="$PATH" GUARDS="$GUARDS" \
  PREFLIGHT_DATABASE_URL=postgresql://fixture:do-not-print-me@database.trener-app.com:5432/trainer_app \
  bash -c 'source "$GUARDS"; assert_explicit_preflight_database')" || fail "explicit production preflight URL was rejected"
grep -q 'host=database.trener-app.com port=5432 database=trainer_app' <<<"$preflight_output" \
  || fail "preflight target output was not sanitized"
if grep -q 'do-not-print-me\|fixture@' <<<"$preflight_output"; then
  fail "preflight output leaked URL credentials"
fi

preflight_run_output="$(env -i \
  PATH="$PREFLIGHT_FIXTURE_BIN:$PATH" \
  PREFLIGHT_DATABASE_URL=postgresql://fixture:do-not-print-me@database.trener-app.com:5432/trainer_app \
  EXPECTED_MIGRATION=0010_workout_series \
  bash "$PREFLIGHT")" || fail "mocked read-only preflight did not pass"
grep -q 'production preflight passed without reading or printing row-level data' <<<"$preflight_run_output" \
  || fail "preflight success evidence is absent"
if grep -q 'do-not-print-me\|fixture@' <<<"$preflight_run_output"; then
  fail "preflight execution leaked URL credentials"
fi
if env -i \
  PATH="$PREFLIGHT_FIXTURE_BIN:$PATH" \
  PREFLIGHT_DATABASE_URL=postgresql://fixture:do-not-print-me@database.trener-app.com:5432/trainer_app \
  EXPECTED_MIGRATION=0010_workout_series \
  FAKE_PREFLIGHT_FAIL=true \
  bash "$PREFLIGHT" >/dev/null 2>&1; then
  fail "preflight accepted an invariant violation"
fi
if env -i \
  PATH="$PREFLIGHT_FIXTURE_BIN:$PATH" \
  PREFLIGHT_DATABASE_URL=postgresql://fixture:do-not-print-me@database.trener-app.com:5432/trainer_app \
  EXPECTED_MIGRATION=0010_workout_series \
  FAKE_PREFLIGHT_EMPTY=true \
  bash "$PREFLIGHT" >/dev/null 2>&1; then
  fail "preflight accepted an empty check result"
fi

printf 'PostgreSQL guard tests passed without database contact\n'
