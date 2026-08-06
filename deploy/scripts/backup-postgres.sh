#!/usr/bin/env bash

set -Eeuo pipefail

umask 077

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_FORMAT="${BACKUP_FORMAT:-plain}"
BACKUP_TIMESTAMP="${BACKUP_TIMESTAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"

raw_tmp=""
gzip_tmp=""

cleanup() {
  [[ -z "$raw_tmp" ]] || rm -f -- "$raw_tmp"
  [[ -z "$gzip_tmp" ]] || rm -f -- "$gzip_tmp"
}
trap cleanup EXIT INT TERM

fail() {
  printf 'backup failed: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command is unavailable: $1"
}

[[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] || fail "BACKUP_RETENTION_DAYS must be a non-negative integer"
[[ "$BACKUP_TIMESTAMP" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || fail "BACKUP_TIMESTAMP has an invalid UTC timestamp shape"

case "$BACKUP_FORMAT" in
  plain)
    extension="sql.gz"
    pg_dump_format="plain"
    ;;
  custom)
    extension="dump.gz"
    pg_dump_format="custom"
    require_command pg_restore
    ;;
  *)
    fail "BACKUP_FORMAT must be plain or custom"
    ;;
esac

require_command pg_dump
require_command gzip
require_command find
require_command mktemp

mkdir -p -- "$BACKUP_DIR"
final_file="$BACKUP_DIR/trainer_app_${BACKUP_TIMESTAMP}.${extension}"
[[ ! -e "$final_file" ]] || fail "refusing to overwrite an existing backup"

raw_tmp="$(mktemp "$BACKUP_DIR/.trainer-pg-dump.XXXXXX")"
gzip_tmp="$(mktemp "$BACKUP_DIR/.trainer-pg-gzip.XXXXXX")"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

dump_args=(
  "--host=${POSTGRES_HOST:-postgres}"
  "--port=${POSTGRES_PORT:-5432}"
  "--username=${POSTGRES_USER:-trainer_app}"
  "--dbname=${POSTGRES_DB:-trainer_app}"
  "--format=$pg_dump_format"
  "--no-owner"
  "--no-privileges"
  "--file=$raw_tmp"
)

if ! pg_dump "${dump_args[@]}"; then
  fail "pg_dump returned a non-zero exit status"
fi
[[ -s "$raw_tmp" ]] || fail "pg_dump produced an empty file"

if [[ "$BACKUP_FORMAT" == "plain" ]]; then
  grep -q '^-- PostgreSQL database dump' "$raw_tmp" || fail "plain dump header is missing"
  grep -q '^-- PostgreSQL database dump complete' "$raw_tmp" || fail "plain dump completion marker is missing"
else
  pg_restore --list "$raw_tmp" >/dev/null || fail "pg_restore could not list the custom-format dump"
fi

if ! gzip -c -- "$raw_tmp" >"$gzip_tmp"; then
  fail "gzip returned a non-zero exit status"
fi
[[ -s "$gzip_tmp" ]] || fail "gzip produced an empty file"
gzip -t -- "$gzip_tmp" || fail "gzip integrity validation failed"

mv -- "$gzip_tmp" "$final_file"
gzip_tmp=""

# Retention runs only after a validated dump has been atomically published.
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'trainer_app_*.sql.gz' -o -name 'trainer_app_*.dump.gz' \) \
  -mtime "+$BACKUP_RETENTION_DAYS" -delete

printf 'backup complete: %s\n' "$final_file"
