DO $$
BEGIN
  CREATE TYPE workout_series_status AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE activity_events
  ADD COLUMN IF NOT EXISTS deduplication_key text;
CREATE UNIQUE INDEX IF NOT EXISTS activity_events_deduplication_key_key
  ON activity_events(deduplication_key);

CREATE TABLE IF NOT EXISTS workout_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  label text,
  start_date date NOT NULL,
  timezone text NOT NULL,
  status workout_series_status NOT NULL DEFAULT 'ACTIVE',
  duration_minutes integer,
  focus text,
  location text,
  notes text,
  schedule_version integer NOT NULL DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  generation_through date,
  creation_key text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);

CREATE TABLE IF NOT EXISTS workout_series_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES workout_series(id) ON DELETE CASCADE,
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  effective_from date,
  result_through date NOT NULL,
  result_version integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_series_commands_trainer_operation_key
  ON workout_series_commands(trainer_id, operation, idempotency_key);
CREATE INDEX IF NOT EXISTS workout_series_commands_series_created_idx
  ON workout_series_commands(series_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS workout_series_trainer_id_creation_key_key
  ON workout_series(trainer_id, creation_key);
CREATE INDEX IF NOT EXISTS workout_series_trainer_id_status_idx
  ON workout_series(trainer_id, status);
CREATE INDEX IF NOT EXISTS workout_series_trainer_id_client_id_idx
  ON workout_series(trainer_id, client_id);
CREATE INDEX IF NOT EXISTS workout_series_trainer_id_deleted_at_idx
  ON workout_series(trainer_id, deleted_at);

CREATE TABLE IF NOT EXISTS workout_series_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES workout_series(id) ON DELETE CASCADE,
  weekday text NOT NULL,
  local_time text NOT NULL,
  revision integer NOT NULL,
  "order" integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_series_slots_series_revision_weekday_time_key
  ON workout_series_slots(series_id, revision, weekday, local_time);
CREATE INDEX IF NOT EXISTS workout_series_slots_series_revision_order_idx
  ON workout_series_slots(series_id, revision, "order");

CREATE TABLE IF NOT EXISTS workout_series_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES workout_series(id) ON DELETE CASCADE,
  series_slot_id uuid NOT NULL REFERENCES workout_series_slots(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  "order" integer NOT NULL,
  title_snapshot text NOT NULL,
  result_type text,
  superset_with_next boolean,
  planned_set_targets jsonb,
  planned_sets integer,
  planned_reps integer,
  planned_weight double precision,
  planned_duration_sec integer,
  rest_seconds integer,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_series_items_series_id_idx
  ON workout_series_items(series_id);
CREATE INDEX IF NOT EXISTS workout_series_items_slot_order_idx
  ON workout_series_items(series_slot_id, "order");

ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS series_id uuid,
  ADD COLUMN IF NOT EXISTS series_slot_id uuid,
  ADD COLUMN IF NOT EXISTS occurrence_key text,
  ADD COLUMN IF NOT EXISTS scheduled_local_date date,
  ADD COLUMN IF NOT EXISTS scheduled_local_time text,
  ADD COLUMN IF NOT EXISTS label_snapshot text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  ALTER TABLE workout_sessions
    ADD CONSTRAINT workout_sessions_series_id_fkey
    FOREIGN KEY (series_id) REFERENCES workout_series(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE workout_sessions
    ADD CONSTRAINT workout_sessions_series_slot_id_fkey
    FOREIGN KEY (series_slot_id) REFERENCES workout_series_slots(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS workout_sessions_series_id_scheduled_at_idx
  ON workout_sessions(series_id, scheduled_at);
CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_series_id_occurrence_key_key
  ON workout_sessions(series_id, occurrence_key);

-- Convert legacy repeat rules additively. A legacy session without a client or
-- scheduled date remains a standalone occurrence because a series requires both.
WITH legacy AS (
  SELECT
    session.*,
    COALESCE(valid_timezone.name, 'UTC') AS safe_timezone,
    (session.scheduled_at AT TIME ZONE 'UTC') AT TIME ZONE COALESCE(valid_timezone.name, 'UTC') AS local_scheduled_at
  FROM workout_sessions session
  LEFT JOIN pg_timezone_names valid_timezone ON valid_timezone.name = session.timezone
  WHERE session.deleted_at IS NULL
    AND session.client_id IS NOT NULL
    AND session.scheduled_at IS NOT NULL
    AND jsonb_typeof(session.repeat_days) = 'array'
    AND jsonb_array_length(session.repeat_days) > 0
), series_start AS (
  SELECT
    legacy.*,
    (
      SELECT (legacy.local_scheduled_at::date + candidate.offset_days)::date
      FROM generate_series(0, 7) AS candidate(offset_days)
      WHERE CASE EXTRACT(ISODOW FROM legacy.local_scheduled_at::date + candidate.offset_days)::integer
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
        WHEN 7 THEN 'sunday'
      END IN (SELECT jsonb_array_elements_text(legacy.repeat_days))
      ORDER BY candidate.offset_days
      LIMIT 1
    ) AS first_series_date
  FROM legacy
)
INSERT INTO workout_series (
  id, trainer_id, client_id, label, start_date, timezone, status,
  duration_minutes, focus, location, notes, schedule_version, version,
  generation_through, creation_key, created_at, updated_at
)
SELECT
  id, trainer_id, client_id, NULLIF(title, ''), first_series_date, safe_timezone, 'ACTIVE',
  duration_minutes, focus, location, notes, 1, 1,
  GREATEST(first_series_date - 1, (CURRENT_TIMESTAMP AT TIME ZONE safe_timezone)::date - 1), 'legacy:' || id::text, created_at, updated_at
FROM series_start
WHERE first_series_date IS NOT NULL
ON CONFLICT (trainer_id, creation_key) DO NOTHING;

WITH legacy_days AS (
  SELECT
    series.id AS series_id,
    day.value AS weekday,
    day.ordinality::integer - 1 AS slot_order,
    COALESCE(
      CASE
        WHEN (session.schedule_times ->> day.value) ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          THEN session.schedule_times ->> day.value
        ELSE NULL
      END,
      to_char((session.scheduled_at AT TIME ZONE 'UTC') AT TIME ZONE series.timezone, 'HH24:MI')
    ) AS local_time
  FROM workout_series series
  JOIN workout_sessions session ON series.creation_key = 'legacy:' || session.id::text
  CROSS JOIN LATERAL jsonb_array_elements_text(session.repeat_days) WITH ORDINALITY AS day(value, ordinality)
  WHERE day.value IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
)
INSERT INTO workout_series_slots (id, series_id, weekday, local_time, revision, "order")
SELECT
  (
    substr(md5(series_id::text || ':1:' || weekday || ':' || local_time), 1, 8) || '-' ||
    substr(md5(series_id::text || ':1:' || weekday || ':' || local_time), 9, 4) || '-' ||
    substr(md5(series_id::text || ':1:' || weekday || ':' || local_time), 13, 4) || '-' ||
    substr(md5(series_id::text || ':1:' || weekday || ':' || local_time), 17, 4) || '-' ||
    substr(md5(series_id::text || ':1:' || weekday || ':' || local_time), 21, 12)
  )::uuid,
  series_id,
  weekday,
  local_time,
  1,
  slot_order
FROM legacy_days
ON CONFLICT (series_id, revision, weekday, local_time) DO NOTHING;

DO $$
BEGIN
  ALTER TABLE workout_series_slots
    ADD CONSTRAINT workout_series_slots_weekday_check
    CHECK (weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE workout_series_slots
    ADD CONSTRAINT workout_series_slots_local_time_check
    CHECK (local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO workout_series_items (
  id, series_id, series_slot_id, exercise_id, "order", title_snapshot,
  result_type, superset_with_next, planned_set_targets, planned_sets,
  planned_reps, planned_weight, planned_duration_sec, rest_seconds, notes,
  created_at, updated_at
)
SELECT
  (
    substr(md5(slot.id::text || ':' || item.id::text), 1, 8) || '-' ||
    substr(md5(slot.id::text || ':' || item.id::text), 9, 4) || '-' ||
    substr(md5(slot.id::text || ':' || item.id::text), 13, 4) || '-' ||
    substr(md5(slot.id::text || ':' || item.id::text), 17, 4) || '-' ||
    substr(md5(slot.id::text || ':' || item.id::text), 21, 12)
  )::uuid,
  series.id,
  slot.id,
  item.exercise_id,
  item."order",
  COALESCE(NULLIF(item.title_snapshot, ''), exercise.name, 'Упражнение'),
  item.result_type,
  item.superset_with_next,
  item.planned_set_targets,
  item.planned_sets,
  item.planned_reps,
  item.planned_weight,
  item.planned_duration_sec,
  item.rest_seconds,
  item.notes,
  item.created_at,
  item.updated_at
FROM workout_series series
JOIN workout_sessions session ON series.creation_key = 'legacy:' || session.id::text
JOIN workout_series_slots slot ON slot.series_id = series.id AND slot.revision = 1
JOIN workout_session_items item ON item.workout_session_id = session.id
LEFT JOIN exercises exercise ON exercise.id = item.exercise_id
WHERE item.day IS NULL OR item.day = slot.weekday
ON CONFLICT (id) DO NOTHING;

WITH matching_legacy_occurrence AS (
  SELECT
    session.id AS session_id,
    series.id AS series_id,
    slot.id AS slot_id,
    slot.weekday,
    ((session.scheduled_at AT TIME ZONE 'UTC') AT TIME ZONE series.timezone)::date AS local_date,
    slot.local_time
  FROM workout_series series
  JOIN workout_sessions session ON series.creation_key = 'legacy:' || session.id::text
  JOIN workout_series_slots slot
    ON slot.series_id = series.id
   AND slot.revision = 1
   AND slot.weekday = CASE EXTRACT(ISODOW FROM ((session.scheduled_at AT TIME ZONE 'UTC') AT TIME ZONE series.timezone))::integer
      WHEN 1 THEN 'monday'
      WHEN 2 THEN 'tuesday'
      WHEN 3 THEN 'wednesday'
      WHEN 4 THEN 'thursday'
      WHEN 5 THEN 'friday'
      WHEN 6 THEN 'saturday'
      WHEN 7 THEN 'sunday'
    END
)
UPDATE workout_sessions session
SET
  series_id = matching.series_id,
  series_slot_id = matching.slot_id,
  occurrence_key = 'v1:' || matching.slot_id::text || ':' || matching.local_date::text,
  scheduled_local_date = matching.local_date,
  scheduled_local_time = matching.local_time,
  label_snapshot = NULLIF(session.title, ''),
  version = 1
FROM matching_legacy_occurrence matching
WHERE session.id = matching.session_id
  AND session.series_id IS NULL;

-- Product invariant: one non-superseded concrete occurrence per local date in a series.
CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_series_local_date_active_key
  ON workout_sessions(series_id, scheduled_local_date)
  WHERE series_id IS NOT NULL
    AND scheduled_local_date IS NOT NULL
    AND deleted_at IS NULL
    AND status <> 'SUPERSEDED';

-- Keep the original occurrence and all of its items/results intact. Generated
-- sessions use slot-specific series items; legacy data cleanup is a later
-- contract migration after the old API can no longer be rolled back.
