import { Prisma, PrismaClient } from "@prisma/client";
import { AuthApiError } from "../errors";
import type { AccountDeletionRepository } from "./types";

type LockedUser = {
  id: string;
  email: string | null;
};

type ConflictResult = {
  hasConflict: boolean;
};

export class PrismaAccountDeletionRepository implements AccountDeletionRepository {
  constructor(private readonly prisma = new PrismaClient()) {}

  async deleteAccount(userId: string) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const [user] = await tx.$queryRaw<LockedUser[]>`
              SELECT id::text AS id, email
              FROM users
              WHERE id = ${userId}::uuid AND deleted_at IS NULL
              FOR UPDATE
            `;
            if (!user) throw new AuthApiError("session_expired", 401);

            if (user.email) {
              const [duplicate] = await tx.$queryRaw<ConflictResult[]>`
                SELECT EXISTS (
                  SELECT 1
                  FROM users
                  WHERE id <> ${userId}::uuid
                    AND deleted_at IS NULL
                    AND email IS NOT NULL
                    AND lower(email) = lower(${user.email})
                ) AS "hasConflict"
              `;
              if (duplicate?.hasConflict) throw deletionConflict();
            }

            const [crossOwner] = await tx.$queryRaw<ConflictResult[]>`
              SELECT EXISTS (
                SELECT 1
                FROM workout_templates wt
                JOIN clients c ON c.id = wt.client_id
                WHERE wt.trainer_id <> ${userId}::uuid AND c.trainer_id = ${userId}::uuid
                UNION ALL
                SELECT 1
                FROM workout_sessions ws
                JOIN clients c ON c.id = ws.client_id
                WHERE ws.trainer_id <> ${userId}::uuid AND c.trainer_id = ${userId}::uuid
                UNION ALL
                SELECT 1
                FROM workout_sessions ws
                JOIN workout_templates wt ON wt.id = ws.workout_template_id
                WHERE ws.trainer_id <> ${userId}::uuid AND wt.trainer_id = ${userId}::uuid
                UNION ALL
                SELECT 1
                FROM workout_template_items wti
                JOIN workout_templates wt ON wt.id = wti.workout_template_id
                JOIN exercises e ON e.id = wti.exercise_id
                WHERE wt.trainer_id <> ${userId}::uuid AND e.trainer_id = ${userId}::uuid
                UNION ALL
                SELECT 1
                FROM workout_session_items wsi
                JOIN workout_sessions ws ON ws.id = wsi.workout_session_id
                JOIN exercises e ON e.id = wsi.exercise_id
                WHERE ws.trainer_id <> ${userId}::uuid AND e.trainer_id = ${userId}::uuid
              ) AS "hasConflict"
            `;
            if (crossOwner?.hasConflict) throw deletionConflict();

            await tx.activityEvent.deleteMany({ where: { userId } });
            await tx.adminAuditLog.deleteMany({ where: { targetType: "trainer", targetId: userId } });
            if (user.email) {
              await tx.emailLoginCode.deleteMany({
                where: { email: { equals: user.email, mode: "insensitive" } }
              });
            }
            await tx.user.delete({ where: { id: userId } });

            return { email: user.email };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (error) {
        if (attempt < maxAttempts && isSerializationConflict(error)) continue;
        throw error;
      }
    }

    throw new Error("Account deletion retry loop exhausted");
  }
}

function deletionConflict() {
  return new AuthApiError("account_conflict", 409, "Удаление аккаунта временно недоступно");
}

function isSerializationConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "P2034" || code === "40001") return true;
  const causeCode = (error as { cause?: { code?: unknown } }).cause?.code;
  return causeCode === "40001";
}
