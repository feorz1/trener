#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=lib/postgres-guards.sh
source "$SCRIPT_DIR/lib/postgres-guards.sh"

fail() {
  printf 'production preflight failed: %s\n' "$1" >&2
  exit 1
}

command -v psql >/dev/null 2>&1 || fail "psql is required"
assert_explicit_preflight_database || exit 1

EXPECTED_MIGRATION="${EXPECTED_MIGRATION:-}"
if [[ -z "$EXPECTED_MIGRATION" ]]; then
  for migration_dir in "$REPO_ROOT"/server/prisma/migrations/*; do
    [[ -f "$migration_dir/migration.sql" ]] || continue
    migration_name="${migration_dir##*/}"
    if [[ -z "$EXPECTED_MIGRATION" || "$migration_name" > "$EXPECTED_MIGRATION" ]]; then
      EXPECTED_MIGRATION="$migration_name"
    fi
  done
fi
[[ -n "$EXPECTED_MIGRATION" ]] || fail "EXPECTED_MIGRATION is required when migration files are unavailable"

MIN_SYSTEM_EXERCISES="${MIN_SYSTEM_EXERCISES:-200}"
[[ "$MIN_SYSTEM_EXERCISES" =~ ^[0-9]+$ ]] || fail "MIN_SYSTEM_EXERCISES must be a non-negative integer"

if ! check_output="$({
  PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000' \
    psql --dbname="$PREFLIGHT_DATABASE_URL" -X --no-psqlrc --quiet -A -t -F $'\t' --set=ON_ERROR_STOP=1 \
      --set=expected_migration="$EXPECTED_MIGRATION" \
      --set=min_system_exercises="$MIN_SYSTEM_EXERCISES" <<'SQL'
BEGIN TRANSACTION READ ONLY;

WITH checks(name, failures) AS (
  SELECT 'migrations',
    (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL)
    + CASE WHEN EXISTS (
        SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = :'expected_migration' AND finished_at IS NOT NULL
      ) THEN 0 ELSE 1 END
  UNION ALL
  SELECT 'active_email_duplicates', count(*) FROM (
    SELECT lower(email)
    FROM users
    WHERE email IS NOT NULL AND deleted_at IS NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) duplicates
  UNION ALL
  SELECT 'cross_owner_links',
    (SELECT count(*) FROM workout_templates t JOIN clients c ON c.id = t.client_id WHERE c.trainer_id <> t.trainer_id)
    + (SELECT count(*) FROM workout_sessions s JOIN clients c ON c.id = s.client_id WHERE c.trainer_id <> s.trainer_id)
    + (SELECT count(*) FROM workout_series s JOIN clients c ON c.id = s.client_id WHERE c.trainer_id <> s.trainer_id)
    + (SELECT count(*) FROM workout_sessions occurrence JOIN workout_series series ON series.id = occurrence.series_id WHERE series.trainer_id <> occurrence.trainer_id)
    + (SELECT count(*) FROM workout_sessions s JOIN workout_templates t ON t.id = s.workout_template_id WHERE t.trainer_id <> s.trainer_id)
    + (SELECT count(*) FROM workout_template_items i JOIN workout_templates t ON t.id = i.workout_template_id JOIN exercises e ON e.id = i.exercise_id WHERE e.trainer_id IS NOT NULL AND e.trainer_id <> t.trainer_id)
    + (SELECT count(*) FROM workout_session_items i JOIN workout_sessions s ON s.id = i.workout_session_id JOIN exercises e ON e.id = i.exercise_id WHERE e.trainer_id IS NOT NULL AND e.trainer_id <> s.trainer_id)
  UNION ALL
  SELECT 'orphans',
    (SELECT count(*) FROM clients c LEFT JOIN users u ON u.id = c.trainer_id WHERE u.id IS NULL)
    + (SELECT count(*) FROM exercises e LEFT JOIN users u ON u.id = e.trainer_id WHERE e.trainer_id IS NOT NULL AND u.id IS NULL)
    + (SELECT count(*) FROM workout_templates t LEFT JOIN users u ON u.id = t.trainer_id LEFT JOIN clients c ON c.id = t.client_id WHERE u.id IS NULL OR (t.client_id IS NOT NULL AND c.id IS NULL))
    + (SELECT count(*) FROM workout_template_items i LEFT JOIN workout_templates t ON t.id = i.workout_template_id LEFT JOIN exercises e ON e.id = i.exercise_id WHERE t.id IS NULL OR (i.exercise_id IS NOT NULL AND e.id IS NULL))
    + (SELECT count(*) FROM workout_sessions s LEFT JOIN users u ON u.id = s.trainer_id LEFT JOIN clients c ON c.id = s.client_id LEFT JOIN workout_templates t ON t.id = s.workout_template_id WHERE u.id IS NULL OR (s.client_id IS NOT NULL AND c.id IS NULL) OR (s.workout_template_id IS NOT NULL AND t.id IS NULL))
    + (SELECT count(*) FROM workout_series s LEFT JOIN users u ON u.id = s.trainer_id LEFT JOIN clients c ON c.id = s.client_id WHERE u.id IS NULL OR c.id IS NULL)
    + (SELECT count(*) FROM workout_series_slots slot LEFT JOIN workout_series series ON series.id = slot.series_id WHERE series.id IS NULL)
    + (SELECT count(*) FROM workout_series_items item LEFT JOIN workout_series series ON series.id = item.series_id LEFT JOIN workout_series_slots slot ON slot.id = item.series_slot_id LEFT JOIN exercises exercise ON exercise.id = item.exercise_id WHERE series.id IS NULL OR slot.id IS NULL OR (item.exercise_id IS NOT NULL AND exercise.id IS NULL))
    + (SELECT count(*) FROM workout_series_commands command LEFT JOIN users u ON u.id = command.trainer_id LEFT JOIN workout_series series ON series.id = command.series_id WHERE u.id IS NULL OR series.id IS NULL OR series.trainer_id <> command.trainer_id)
    + (SELECT count(*) FROM workout_session_items i LEFT JOIN workout_sessions s ON s.id = i.workout_session_id LEFT JOIN exercises e ON e.id = i.exercise_id WHERE s.id IS NULL OR (i.exercise_id IS NOT NULL AND e.id IS NULL))
    + (SELECT count(*) FROM workout_set_results r LEFT JOIN workout_session_items i ON i.id = r.workout_session_item_id WHERE i.id IS NULL)
    + (SELECT count(*) FROM auth_identities i LEFT JOIN users u ON u.id = i.user_id WHERE u.id IS NULL)
    + (SELECT count(*) FROM refresh_tokens r LEFT JOIN users u ON u.id = r.user_id WHERE u.id IS NULL)
    + (SELECT count(*) FROM login_tickets t LEFT JOIN users u ON u.id = t.user_id WHERE u.id IS NULL)
    + (SELECT count(*) FROM activity_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.user_id IS NOT NULL AND u.id IS NULL)
    + (SELECT count(*) FROM admin_sessions s LEFT JOIN admin_users u ON u.id = s.admin_user_id WHERE u.id IS NULL)
    + (SELECT count(*) FROM admin_audit_logs l LEFT JOIN admin_users u ON u.id = l.admin_user_id WHERE l.admin_user_id IS NOT NULL AND u.id IS NULL)
  UNION ALL
  SELECT 'foreign_key_rules', count(*) FROM (
    VALUES
      ('clients', 'users', 'c'),
      ('exercises', 'users', 'c'),
      ('workout_templates', 'users', 'c'),
      ('workout_templates', 'clients', 'n'),
      ('workout_template_items', 'workout_templates', 'c'),
      ('workout_template_items', 'exercises', 'n'),
      ('workout_sessions', 'users', 'c'),
      ('workout_sessions', 'clients', 'n'),
      ('workout_sessions', 'workout_templates', 'n'),
      ('workout_series', 'users', 'c'),
      ('workout_series', 'clients', 'c'),
      ('workout_series_slots', 'workout_series', 'c'),
      ('workout_series_items', 'workout_series', 'c'),
      ('workout_series_items', 'workout_series_slots', 'c'),
      ('workout_series_items', 'exercises', 'n'),
      ('workout_series_commands', 'users', 'c'),
      ('workout_series_commands', 'workout_series', 'c'),
      ('workout_sessions', 'workout_series', 'n'),
      ('workout_sessions', 'workout_series_slots', 'n'),
      ('workout_session_items', 'workout_sessions', 'c'),
      ('workout_session_items', 'exercises', 'n'),
      ('workout_set_results', 'workout_session_items', 'c'),
      ('auth_identities', 'users', 'c'),
      ('refresh_tokens', 'users', 'c'),
      ('login_tickets', 'users', 'c'),
      ('activity_events', 'users', 'n'),
      ('admin_sessions', 'admin_users', 'c'),
      ('admin_audit_logs', 'admin_users', 'n')
  ) expected(source_table, target_table, delete_action)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.contype = 'f'
      AND constraint_row.conrelid = expected.source_table::regclass
      AND constraint_row.confrelid = expected.target_table::regclass
      AND constraint_row.confdeltype::text = expected.delete_action
  )
  UNION ALL
  SELECT 'system_exercise_seed', CASE
    WHEN count(*) >= :min_system_exercises::integer
      AND count(*) FILTER (WHERE system_key IS NULL) = 0
    THEN 0 ELSE 1 END
  FROM exercises
  WHERE is_system = true AND deleted_at IS NULL
  UNION ALL
  SELECT 'release_schema_contract', count(*) + CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_index index_row
      JOIN pg_class index_class ON index_class.oid = index_row.indexrelid
      WHERE index_class.relname = 'workout_sessions_series_local_date_active_key'
        AND pg_get_expr(index_row.indpred, index_row.indrelid) LIKE '%deleted_at IS NULL%'
        AND pg_get_expr(index_row.indpred, index_row.indrelid) LIKE '%SUPERSEDED%'
    ) THEN 0 ELSE 1 END
  FROM (
    VALUES
      ('exercises', 'primary_muscles'),
      ('workout_template_items', 'planned_set_targets'),
      ('workout_sessions', 'timezone'),
      ('workout_session_items', 'planned_set_targets'),
      ('account_deletion_receipts', 'operation_id')
      , ('workout_series', 'schedule_version')
      , ('workout_series_slots', 'local_time')
      , ('workout_series_commands', 'request_hash')
      , ('workout_series_commands', 'result_through')
      , ('workout_sessions', 'occurrence_key')
      , ('activity_events', 'deduplication_key')
  ) expected(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name = expected.table_name
      AND actual.column_name = expected.column_name
  )
)
SELECT name, failures FROM checks ORDER BY name;

COMMIT;
SQL
} 2>&1)"; then
  printf '%s\n' "$check_output" >&2
  fail "read-only SQL checks could not complete"
fi

failed=0
observed_checks=""
while IFS=$'\t' read -r check_name failures; do
  [[ -n "$check_name" ]] || continue
  [[ "$failures" =~ ^[0-9]+$ ]] || fail "check $check_name returned an invalid violation count"
  observed_checks="${observed_checks}${check_name}"$'\n'
  if [[ "$failures" == "0" ]]; then
    printf 'preflight check passed: %s\n' "$check_name"
  else
    printf 'preflight check failed: %s (%s violation(s))\n' "$check_name" "$failures" >&2
    failed=1
  fi
done <<<"$check_output"

expected_checks=$'active_email_duplicates\ncross_owner_links\nforeign_key_rules\nmigrations\norphans\nrelease_schema_contract\nsystem_exercise_seed\n'
[[ "$observed_checks" == "$expected_checks" ]] || fail "database did not return the complete expected check set"
[[ "$failed" == "0" ]] || fail "one or more invariants failed"
printf 'production preflight passed without reading or printing row-level data\n'
