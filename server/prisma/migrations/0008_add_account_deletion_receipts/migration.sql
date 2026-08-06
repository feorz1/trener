CREATE TABLE "account_deletion_receipts" (
  "operation_id" UUID NOT NULL,
  "recovery_secret_hash" TEXT NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "account_deletion_receipts_pkey" PRIMARY KEY ("operation_id")
);

CREATE INDEX "account_deletion_receipts_expires_at_idx"
  ON "account_deletion_receipts"("expires_at");
