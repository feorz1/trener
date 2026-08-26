import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const expectedMigration = process.env.EXPECTED_MIGRATION || "0010_workout_series";
const readyUrl = process.env.API_READY_URL || "http://127.0.0.1:3000/ready";

try {
  const response = await fetch(readyUrl, { signal: AbortSignal.timeout(4_000) });
  if (!response.ok) throw new Error("readiness endpoint is not healthy");
  const payload = await response.json();
  if (payload?.ok !== true) throw new Error("readiness endpoint returned an invalid payload");

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       EXISTS (
         SELECT 1 FROM "_prisma_migrations"
         WHERE migration_name = $1 AND finished_at IS NOT NULL
       ) AS migration_ready,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'workout_session_items'
           AND column_name = 'planned_set_targets'
       ) AS roundtrip_schema_ready,
       to_regclass('public.account_deletion_receipts') IS NOT NULL AS deletion_receipts_ready,
       to_regclass('public.workout_series') IS NOT NULL AS workout_series_ready,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'workout_series_commands'
           AND column_name = 'result_through'
       ) AS workout_series_commands_ready,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'activity_events'
           AND column_name = 'deduplication_key'
       ) AS activity_event_deduplication_ready,
       EXISTS (
         SELECT 1
         FROM pg_index index_row
         JOIN pg_class index_class ON index_class.oid = index_row.indexrelid
         WHERE index_class.relname = 'workout_sessions_series_local_date_active_key'
           AND pg_get_expr(index_row.indpred, index_row.indrelid) LIKE '%deleted_at IS NULL%'
           AND pg_get_expr(index_row.indpred, index_row.indrelid) LIKE '%SUPERSEDED%'
       ) AS workout_series_local_date_index_ready`,
    expectedMigration
  );
  const contract = rows[0];
  if (!contract?.migration_ready || !contract?.roundtrip_schema_ready || !contract?.deletion_receipts_ready || !contract?.workout_series_ready || !contract?.workout_series_commands_ready || !contract?.activity_event_deduplication_ready || !contract?.workout_series_local_date_index_ready) {
    throw new Error("required schema contract is unavailable");
  }
} catch {
  console.error("schema-aware API readiness check failed");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
