ALTER TABLE "clients"
ADD COLUMN "profile" JSONB NOT NULL DEFAULT '{}'::jsonb;
