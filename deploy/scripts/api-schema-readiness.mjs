import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const expectedMigration = process.env.EXPECTED_MIGRATION || "0008_add_account_deletion_receipts";
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
       to_regclass('public.account_deletion_receipts') IS NOT NULL AS deletion_receipts_ready`,
    expectedMigration
  );
  const contract = rows[0];
  if (!contract?.migration_ready || !contract?.roundtrip_schema_ready || !contract?.deletion_receipts_ready) {
    throw new Error("required schema contract is unavailable");
  }
} catch {
  console.error("schema-aware API readiness check failed");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
