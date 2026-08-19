ALTER TABLE "exercises"
  ADD COLUMN "primary_muscles" JSONB,
  ADD COLUMN "secondary_muscles" JSONB,
  ADD COLUMN "result_type" TEXT;

ALTER TABLE "workout_template_items"
  ADD COLUMN "result_type" TEXT,
  ADD COLUMN "day" TEXT,
  ADD COLUMN "superset_with_next" BOOLEAN,
  ADD COLUMN "planned_set_targets" JSONB;

ALTER TABLE "workout_sessions"
  ADD COLUMN "timezone" TEXT,
  ADD COLUMN "duration_minutes" INTEGER,
  ADD COLUMN "focus" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "repeat_days" JSONB,
  ADD COLUMN "schedule_times" JSONB;

ALTER TABLE "workout_session_items"
  ADD COLUMN "result_type" TEXT,
  ADD COLUMN "day" TEXT,
  ADD COLUMN "superset_with_next" BOOLEAN,
  ADD COLUMN "planned_set_targets" JSONB;
