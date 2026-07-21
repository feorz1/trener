#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/trainer_app_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
pg_dump \
  --host="${POSTGRES_HOST:-postgres}" \
  --username="${POSTGRES_USER:-trainer_app}" \
  --dbname="${POSTGRES_DB:-trainer_app}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip > "$FILE"

find "$BACKUP_DIR" -type f -name "trainer_app_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Created backup: $FILE"
