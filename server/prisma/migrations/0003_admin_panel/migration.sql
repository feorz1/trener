ALTER TABLE "users"
  ADD COLUMN "last_seen_at" TIMESTAMP(3),
  ADD COLUMN "blocked_at" TIMESTAMP(3),
  ADD COLUMN "blocked_reason" TEXT;

CREATE TYPE "admin_role" AS ENUM ('OWNER', 'ADMIN', 'SUPPORT', 'READ_ONLY');

CREATE TABLE "admin_users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "admin_role" NOT NULL DEFAULT 'ADMIN',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "csrf_token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "ip_hash" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_user_id" UUID,
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "metadata" JSONB,
  "ip_hash" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX "admin_sessions_admin_user_id_idx" ON "admin_sessions"("admin_user_id");
CREATE INDEX "admin_sessions_token_hash_idx" ON "admin_sessions"("token_hash");
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs"("admin_user_id");
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");
CREATE INDEX "admin_audit_logs_target_type_target_id_idx" ON "admin_audit_logs"("target_type", "target_id");
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

ALTER TABLE "admin_sessions"
  ADD CONSTRAINT "admin_sessions_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
