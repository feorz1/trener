ALTER TABLE "exercises" ADD COLUMN "system_key" TEXT;

CREATE UNIQUE INDEX "exercises_system_key_key" ON "exercises"("system_key");
