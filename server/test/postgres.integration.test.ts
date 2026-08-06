import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaAccountDeletionRepository } from "../src/accountDeletion/PrismaAccountDeletionRepository";
import { PrismaAdminRepository } from "../src/admin/PrismaAdminRepository";
import { buildApi } from "../src/app";
import { loadAuthConfig } from "../src/config";
import { PrismaTrainerDataRepository } from "../src/data/PrismaTrainerDataRepository";
import { PrismaAuthRepository } from "../src/repositories/PrismaAuthRepository";
import { hashSecret } from "../src/security";
import type { EmailSender, NormalizedOAuthProfile, OAuthProvider, OAuthProviderAdapter } from "../src/types";

const POSTGRES_SENTINEL = "RUN_DISPOSABLE_POSTGRES_INTEGRATION";
const postgresEnabled =
  process.env.POSTGRES_INTEGRATION_SENTINEL === POSTGRES_SENTINEL &&
  process.env.ACCOUNT_DELETION_TEST_DB_ACK === "DELETE_DISPOSABLE_DATABASE" &&
  process.env.NODE_ENV !== "production" &&
  Boolean(process.env.TEST_DATABASE_URL) &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL;
const describePostgres = postgresEnabled ? describe : describe.skip;

class CapturingEmailSender implements EmailSender {
  sent: Array<{ email: string; code: string; ttlSeconds: number }> = [];

  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    this.sent.push(params);
  }
}

class FakeOAuthAdapter implements OAuthProviderAdapter {
  constructor(readonly provider: OAuthProvider) {}

  async getAuthorizationUrl(params: { state: string; redirectUri: string; codeChallenge?: string }) {
    const url = new URL(`https://${this.provider}.integration.invalid/authorize`);
    url.searchParams.set("state", params.state);
    url.searchParams.set("redirect_uri", params.redirectUri);
    if (params.codeChallenge) url.searchParams.set("code_challenge", params.codeChallenge);
    return url.toString();
  }

  async exchangeCode() {
    return { access_token: `${this.provider}-integration-token` };
  }

  async getProfile(): Promise<NormalizedOAuthProfile> {
    return {
      provider: this.provider,
      subject: `${this.provider}-postgres-subject`,
      email: `${this.provider}-postgres@example.com`,
      emailVerified: true,
      displayName: `${this.provider} postgres trainer`,
      avatarUrl: null,
      rawProfile: { suite: "postgres" }
    };
  }
}

describe("PostgreSQL integration runner safety", () => {
  it("keeps destructive execution behind explicit disposable-database guards", async () => {
    const runnerPath = resolve(process.cwd(), "scripts/run-postgres-integration.mjs");
    const source = await readFile(runnerPath, "utf8");

    expect(source).toContain('process.env.TEST_DATABASE_URL');
    expect(source).toContain('ACCOUNT_DELETION_TEST_DB_ACK !== REQUIRED_ACK');
    expect(source).toContain('const REQUIRED_ACK = "DELETE_DISPOSABLE_DATABASE"');
    expect(source).toContain('NODE_ENV?.toLowerCase() === "production"');
    expect(source).toContain('database name must include test or disposable');
    expect(source).toContain('DATABASE_URL must be unset for destructive PostgreSQL integration tests');
    expect(source).toContain('shell: false');
    expect(source).toContain('["run", "server/test/postgres.integration.test.ts", "--no-file-parallelism"]');
    expect(source).not.toMatch(/TEST_DATABASE_URL\s*(?:\|\||\?\?)/);
    expect(source).not.toMatch(/(?:\|\||\?\?)\s*process\.env\.DATABASE_URL/);
  });
});

describePostgres("real PostgreSQL integration", () => {
  const prisma = new PrismaClient();
  const authRepository = new PrismaAuthRepository();
  const dataRepository = new PrismaTrainerDataRepository();
  const adminRepository = new PrismaAdminRepository();
  const deletionRepository = new PrismaAccountDeletionRepository(prisma);
  const emailSender = new CapturingEmailSender();
  const config = loadAuthConfig({
    NODE_ENV: "test",
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: "postgres_test_access_secret_1234567890",
    REFRESH_TOKEN_PEPPER: "postgres_test_refresh_pepper_123456789",
    EMAIL_CODE_PEPPER: "postgres_test_email_pepper_12345678901",
    LOGIN_TICKET_PEPPER: "postgres_test_ticket_pepper_1234567890",
    OAUTH_STATE_ENCRYPTION_SECRET: "postgres_test_oauth_secret_12345678901",
    YANDEX_AUTH_ENABLED: "true",
    VK_AUTH_ENABLED: "true",
    YANDEX_CLIENT_ID: "postgres-yandex-client",
    YANDEX_CLIENT_SECRET: "postgres-yandex-secret",
    VK_CLIENT_ID: "postgres-vk-client",
    VK_CLIENT_SECRET: "postgres-vk-secret",
    EMAIL_CODE_RESEND_SECONDS: "0",
    RATE_LIMIT_EMAIL_START_PER_EMAIL: "100",
    RATE_LIMIT_EMAIL_START_PER_IP: "100",
    ADMIN_ENABLED: "false"
  });
  const app = buildApi({
    config,
    repository: authRepository,
    dataRepository,
    adminRepository,
    accountDeletionRepository: deletionRepository,
    emailSender,
    oauthAdapters: {
      yandex: new FakeOAuthAdapter("yandex"),
      vk: new FakeOAuthAdapter("vk")
    }
  });
  let systemExerciseId = "";

  beforeAll(async () => {
    await app.ready();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    systemExerciseId = randomUUID();
    await prisma.exercise.create({
      data: {
        id: systemExerciseId,
        trainerId: null,
        name: "PostgreSQL system exercise",
        isSystem: true,
        systemKey: `postgres-suite-${systemExerciseId}`
      }
    });
    emailSender.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it("applies migrations 0006, 0007, and 0008 with their required schema contracts", async () => {
    const migrations = await prisma.$queryRaw<Array<{ migrationName: string }>>`
      SELECT migration_name AS "migrationName"
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    expect(migrations.map((migration) => migration.migrationName)).toEqual(
      expect.arrayContaining([
        "0006_active_user_email_uniqueness",
        "0007_add_workout_roundtrip_contract",
        "0008_add_account_deletion_receipts"
      ])
    );

    const [schema] = await prisma.$queryRaw<Array<{ activeEmailIndex: boolean; jsonbColumns: bigint; receiptTable: boolean }>>`
      SELECT
        to_regclass('public.users_email_lower_active_unique') IS NOT NULL AS "activeEmailIndex",
        (
          SELECT count(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND data_type = 'jsonb'
            AND (table_name, column_name) IN (
              ('exercises', 'primary_muscles'),
              ('exercises', 'secondary_muscles'),
              ('workout_template_items', 'planned_set_targets'),
              ('workout_sessions', 'repeat_days'),
              ('workout_sessions', 'schedule_times'),
              ('workout_session_items', 'planned_set_targets')
            )
        ) AS "jsonbColumns",
        to_regclass('public.account_deletion_receipts') IS NOT NULL AS "receiptTable"
    `;
    expect(schema).toEqual({ activeEmailIndex: true, jsonbColumns: 6n, receiptTable: true });
    await expect(dataRepository.ready()).resolves.toBeUndefined();
  });

  it("enforces case-insensitive uniqueness only for active user emails", async () => {
    const first = await authRepository.createUser({ email: "Case-Sensitive@example.com" });
    await expect(authRepository.createUser({ email: "case-sensitive@EXAMPLE.com" })).rejects.toMatchObject({ code: "P2002" });

    await prisma.user.update({ where: { id: first.id }, data: { deletedAt: new Date() } });
    const replacement = await authRepository.createUser({ email: "case-sensitive@example.com" });
    expect(replacement.id).not.toBe(first.id);
  });

  it("honors user cascades and SET NULL relations on the migrated schema", async () => {
    const user = await authRepository.createUser({ email: "relations@example.com" });
    await authRepository.upsertIdentity({
      userId: user.id,
      provider: "email",
      providerSubject: "relations@example.com",
      providerEmail: "relations@example.com",
      providerEmailVerified: true
    });
    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: "relations-refresh-hash",
      expiresAt: new Date(Date.now() + 60_000)
    });
    await authRepository.createLoginTicket({
      userId: user.id,
      provider: "yandex",
      ticketHash: "relations-ticket-hash",
      expiresAt: new Date(Date.now() + 60_000)
    });
    await seedTrainerGraph(dataRepository, user.id, "relations");
    await dataRepository.logActivity(user.id, "postgres.relation", "trainer", user.id);

    const admin = await adminRepository.createAdminUser({
      email: "relations-admin@example.com",
      passwordHash: "not-used-in-integration",
      role: "ADMIN"
    });
    await adminRepository.logAudit({
      adminUserId: admin.id,
      action: "postgres.relation",
      targetType: "client",
      targetId: randomUUID()
    });

    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.authIdentity.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.loginTicket.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.client.count({ where: { trainerId: user.id } })).toBe(0);
    expect(await prisma.exercise.count({ where: { trainerId: user.id } })).toBe(0);
    expect(await prisma.workoutTemplate.count({ where: { trainerId: user.id } })).toBe(0);
    expect(await prisma.workoutSession.count({ where: { trainerId: user.id } })).toBe(0);
    expect(await prisma.activityEvent.findFirst({ where: { type: "postgres.relation" } })).toMatchObject({ userId: null });

    await prisma.adminUser.delete({ where: { id: admin.id } });
    expect(await prisma.adminAuditLog.findFirst({ where: { action: "postgres.relation" } })).toMatchObject({ adminUserId: null });
  });

  it("rolls back user deletion and every cascade if receipt creation fails", async () => {
    const user = await authRepository.createUser({ email: "rollback-postgres@example.com" });
    const graph = await seedTrainerGraph(dataRepository, user.id, "rollback");

    await expect(
      deletionRepository.deleteAccount(user.id, "not-a-uuid", "rollback-proof-hash", new Date(Date.now() + 60_000))
    ).rejects.toBeTruthy();

    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    expect(await prisma.client.count({ where: { id: graph.clientId } })).toBe(1);
    expect(await prisma.exercise.count({ where: { id: graph.exerciseId } })).toBe(1);
    expect(await prisma.workoutTemplate.count({ where: { id: graph.templateId } })).toBe(1);
    expect(await prisma.workoutSession.count({ where: { id: graph.sessionId } })).toBe(1);
    expect(await prisma.accountDeletionReceipt.count()).toBe(0);
  });

  it("allows exactly one refresh successor and one login-ticket exchange under concurrency", async () => {
    const session = await signInByEmail(app, emailSender, "refresh-postgres@example.com");
    const original = await prisma.refreshToken.findFirstOrThrow({
      where: { userId: session.user.id, rotatedFromTokenId: null }
    });
    const refreshResponses = await Promise.all([
      app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } }),
      app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } })
    ]);
    expect(refreshResponses.map((response) => response.statusCode).sort()).toEqual([200, 401]);
    expect(await prisma.refreshToken.count({ where: { rotatedFromTokenId: original.id } })).toBe(1);

    const started = await app.inject({
      method: "GET",
      url: "/auth/oauth/yandex/start?return_to=app",
      headers: { accept: "application/json" }
    });
    const state = new URL(started.json().authorizationUrl).searchParams.get("state");
    const callback = await app.inject({ method: "GET", url: `/auth/oauth/yandex/callback?code=ok&state=${state}` });
    const ticket = new URL(callback.headers.location!).searchParams.get("ticket");
    const ticketResponses = await Promise.all([
      app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } }),
      app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } })
    ]);
    expect(ticketResponses.map((response) => response.statusCode).sort()).toEqual([200, 400]);
    const ticketUserId = ticketResponses.find((response) => response.statusCode === 200)?.json().user.id as string;
    expect(await prisma.refreshToken.count({ where: { userId: ticketUserId } })).toBe(1);
  });

  it("caps concurrent email-code attempt claims atomically", async () => {
    const record = await authRepository.createEmailCode({
      email: "attempt-claim-postgres@example.com",
      codeHash: "unused-in-repository-claim-test",
      expiresAt: new Date(Date.now() + 60_000),
      lastSentAt: new Date()
    });

    const claims = await Promise.all(
      Array.from({ length: 6 }, () => authRepository.claimEmailCodeAttempt(record.id, new Date(), 2))
    );

    expect(claims.filter(Boolean)).toHaveLength(2);
    expect((await prisma.emailLoginCode.findUniqueOrThrow({ where: { id: record.id } })).attemptCount).toBe(2);
  });

  it("surfaces a real PostgreSQL serialization conflict as Prisma P2034", async () => {
    const user = await authRepository.createUser({ email: "serialization-postgres@example.com" });
    let readers = 0;
    let releaseReaders!: () => void;
    const bothReadersReady = new Promise<void>((resolve) => {
      releaseReaders = resolve;
    });

    const conflictingUpdate = (displayName: string) =>
      prisma.$transaction(
        async (tx) => {
          await tx.user.findUniqueOrThrow({ where: { id: user.id } });
          readers += 1;
          if (readers === 2) releaseReaders();
          await bothReadersReady;
          await tx.user.update({ where: { id: user.id }, data: { displayName } });
        },
        { isolationLevel: "Serializable", timeout: 10_000 }
      );

    const outcomes = await Promise.allSettled([conflictingUpdate("first"), conflictingUpdate("second")]);
    const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
    const rejected = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: "P2034" });
  });

  it("round-trips migration-0007 JSONB fields through the real data repository", async () => {
    const user = await authRepository.createUser({ email: "jsonb-postgres@example.com" });
    const client = await dataRepository.createClient(user.id, { name: "JSONB client" });
    const exercise = await dataRepository.createExercise(user.id, {
      name: "JSONB exercise",
      primaryMuscles: ["quadriceps", "glutes"],
      secondaryMuscles: ["hamstrings"],
      resultType: "weight_reps_rpe"
    });
    const plannedSetId = randomUUID();
    const plannedSetTargets = [
      {
        id: plannedSetId,
        order: 0,
        values: { weight: 82.5, reps: 5, rpe: 8 },
        targetWeightKg: 82.5,
        targetReps: 5,
        targetDurationSeconds: null,
        targetDistanceMeters: null
      }
    ];
    const template = await dataRepository.createWorkoutTemplate(user.id, {
      clientId: client.id,
      title: "JSONB template",
      items: [
        {
          exerciseId: exercise.id,
          order: 0,
          titleSnapshot: exercise.name,
          resultType: "weight_reps_rpe",
          day: "monday",
          supersetWithNext: true,
          plannedSetTargets
        }
      ]
    });
    const session = await dataRepository.createWorkoutSession(user.id, {
      clientId: client.id,
      workoutTemplateId: template.id,
      title: "JSONB session",
      timezone: "Europe/Moscow",
      durationMinutes: 75,
      focus: "strength",
      location: "studio",
      repeatDays: ["monday", "friday"],
      scheduleTimes: { monday: "08:30", friday: "19:15" },
      items: [
        {
          exerciseId: exercise.id,
          order: 0,
          titleSnapshot: exercise.name,
          resultType: "weight_reps_rpe",
          day: "friday",
          supersetWithNext: false,
          plannedSetTargets
        }
      ]
    });
    const setResultId = randomUUID();
    await dataRepository.updateWorkoutResults(user.id, session.id, [
      {
        id: session.items[0].id,
        setResults: [
          {
            id: setResultId,
            setNumber: 1,
            reps: 5,
            weight: 82.5,
            completed: true
          }
        ]
      }
    ]);

    const bootstrap = await dataRepository.bootstrap(user.id);
    expect(bootstrap.exercises.find((record) => record.id === exercise.id)).toMatchObject({
      primaryMuscles: ["quadriceps", "glutes"],
      secondaryMuscles: ["hamstrings"],
      resultType: "weight_reps_rpe"
    });
    expect(bootstrap.workoutTemplates[0].items[0]).toMatchObject({
      day: "monday",
      supersetWithNext: true,
      plannedSetTargets
    });
    expect(bootstrap.workoutSessions[0]).toMatchObject({
      timezone: "Europe/Moscow",
      durationMinutes: 75,
      focus: "strength",
      location: "studio",
      repeatDays: ["monday", "friday"],
      scheduleTimes: { monday: "08:30", friday: "19:15" }
    });
    expect(bootstrap.workoutSessions[0].items[0]).toMatchObject({
      day: "friday",
      supersetWithNext: false,
      plannedSetTargets,
      setResults: [expect.objectContaining({ id: setResultId, reps: 5, weight: 82.5, completed: true })]
    });
  });

  it("reconciles concurrent deletion, retained expired receipts, re-registration, and ownership boundaries", async () => {
    const ownerA = await signInByEmail(app, emailSender, "delete-a-postgres@example.com");
    const ownerB = await signInByEmail(app, emailSender, "delete-b-postgres@example.com");
    const graphA = await seedTrainerGraph(dataRepository, ownerA.user.id, "delete-a");
    const graphB = await seedTrainerGraph(dataRepository, ownerB.user.id, "delete-b");
    const operationId = randomUUID();
    const recoverySecret = randomBytes(32).toString("base64url");
    const recoverySecretHash = hashSecret(
      `account-deletion-recovery:${operationId}:${recoverySecret}`,
      config.tokens.refreshPepper
    );
    const expiresAt = new Date(Date.now() + 60_000);

    const [firstDelete, secondDelete] = await Promise.all([
      deletionRepository.deleteAccount(ownerA.user.id, operationId, recoverySecretHash, expiresAt),
      deletionRepository.deleteAccount(ownerA.user.id, operationId, recoverySecretHash, expiresAt),
      adminRepository.logAudit({
        action: "trainer.concurrent-delete",
        targetType: "trainer",
        targetId: ownerA.user.id
      })
    ]);
    expect([firstDelete.alreadyCompleted, secondDelete.alreadyCompleted].sort()).toEqual([false, true]);
    expect(await prisma.adminAuditLog.count({ where: { targetType: "trainer", targetId: ownerA.user.id } })).toBe(0);

    await prisma.accountDeletionReceipt.update({ where: { operationId }, data: { expiresAt: new Date(0) } });
    await expect(
      deletionRepository.deleteAccount(ownerA.user.id, operationId, recoverySecretHash, new Date(0))
    ).resolves.toMatchObject({ alreadyCompleted: true });
    await expect(
      deletionRepository.deleteAccount(ownerA.user.id, operationId, "wrong-proof-hash", new Date(0))
    ).rejects.toMatchObject({ code: "session_expired", statusCode: 401 });

    const recovered = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: { confirmation: "DELETE", operationId, recoverySecret }
    });
    const wrongProof = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: { confirmation: "DELETE", operationId, recoverySecret: randomBytes(32).toString("base64url") }
    });
    const unknown = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: { confirmation: "DELETE", operationId: randomUUID(), recoverySecret: randomBytes(32).toString("base64url") }
    });
    expect(recovered.statusCode).toBe(204);
    expect({ status: wrongProof.statusCode, code: wrongProof.json().code }).toEqual({ status: 401, code: "session_expired" });
    expect({ status: unknown.statusCode, code: unknown.json().code }).toEqual({ status: 401, code: "session_expired" });

    expect(await orphanCounts(prisma, ownerA.user.id, "delete-a-postgres@example.com")).toEqual({
      users: 0,
      identities: 0,
      refreshTokens: 0,
      loginTickets: 0,
      emailCodes: 0,
      clients: 0,
      exercises: 0,
      templates: 0,
      sessions: 0,
      activityEvents: 0,
      adminAuditLogs: 0
    });

    const recreatedA = await signInByEmail(app, emailSender, "delete-a-postgres@example.com");
    expect(recreatedA.user.id).not.toBe(ownerA.user.id);
    const replayAfterRecreate = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(recreatedA.accessToken),
      payload: { confirmation: "DELETE", operationId, recoverySecret }
    });
    expect(replayAfterRecreate.statusCode).toBe(204);
    expect(await prisma.user.count({ where: { id: recreatedA.user.id } })).toBe(1);
    expect(await prisma.user.count({ where: { id: ownerB.user.id } })).toBe(1);
    expect(await prisma.client.count({ where: { id: graphB.clientId } })).toBe(1);
    expect(await prisma.exercise.count({ where: { id: graphB.exerciseId } })).toBe(1);
    expect(await prisma.workoutTemplate.count({ where: { id: graphB.templateId } })).toBe(1);
    expect(await prisma.workoutSession.count({ where: { id: graphB.sessionId } })).toBe(1);
    expect(await prisma.exercise.count({ where: { id: systemExerciseId, trainerId: null, isSystem: true } })).toBe(1);
    expect(await prisma.client.count({ where: { id: graphA.clientId } })).toBe(0);

    const receipt = await prisma.accountDeletionReceipt.findUniqueOrThrow({ where: { operationId } });
    expect(receipt.recoverySecretHash).toBe(recoverySecretHash);
    expect(receipt.recoverySecretHash).not.toContain(recoverySecret);
    expect(receipt).not.toHaveProperty("userId");
  });
});

async function resetDatabase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "users",
      "admin_users",
      "email_login_codes",
      "oauth_states",
      "account_deletion_receipts"
    RESTART IDENTITY CASCADE
  `);
}

async function signInByEmail(app: ReturnType<typeof buildApi>, emailSender: CapturingEmailSender, email: string) {
  const started = await app.inject({ method: "POST", url: "/auth/email/start", payload: { email } });
  expect(started.statusCode).toBe(200);
  const code = [...emailSender.sent].reverse().find((message) => message.email.toLowerCase() === email.toLowerCase())?.code;
  expect(code).toBeTruthy();
  const verified = await app.inject({ method: "POST", url: "/auth/email/verify", payload: { email, code } });
  expect(verified.statusCode).toBe(200);
  return verified.json() as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string | null };
  };
}

function authHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

async function seedTrainerGraph(repository: PrismaTrainerDataRepository, trainerId: string, prefix: string) {
  const client = await repository.createClient(trainerId, { name: `${prefix} client` });
  const exercise = await repository.createExercise(trainerId, { name: `${prefix} exercise`, resultType: "weight_reps" });
  const template = await repository.createWorkoutTemplate(trainerId, {
    clientId: client.id,
    title: `${prefix} template`,
    items: [{ exerciseId: exercise.id, order: 0, titleSnapshot: exercise.name, resultType: "weight_reps" }]
  });
  const session = await repository.createWorkoutSession(trainerId, {
    clientId: client.id,
    workoutTemplateId: template.id,
    title: `${prefix} session`,
    items: [{ exerciseId: exercise.id, order: 0, titleSnapshot: exercise.name, resultType: "weight_reps" }]
  });
  await repository.updateWorkoutResults(trainerId, session.id, [
    {
      id: session.items[0].id,
      setResults: [{ id: randomUUID(), setNumber: 1, reps: 8, weight: 60, completed: true }]
    }
  ]);
  await repository.logActivity(trainerId, "workout_session.completed", "workout_session", session.id);
  return { clientId: client.id, exerciseId: exercise.id, templateId: template.id, sessionId: session.id };
}

async function orphanCounts(prisma: PrismaClient, userId: string, email: string) {
  const [
    users,
    identities,
    refreshTokens,
    loginTickets,
    emailCodes,
    clients,
    exercises,
    templates,
    sessions,
    activityEvents,
    adminAuditLogs
  ] = await Promise.all([
    prisma.user.count({ where: { id: userId } }),
    prisma.authIdentity.count({ where: { userId } }),
    prisma.refreshToken.count({ where: { userId } }),
    prisma.loginTicket.count({ where: { userId } }),
    prisma.emailLoginCode.count({ where: { email: { equals: email, mode: "insensitive" } } }),
    prisma.client.count({ where: { trainerId: userId } }),
    prisma.exercise.count({ where: { trainerId: userId } }),
    prisma.workoutTemplate.count({ where: { trainerId: userId } }),
    prisma.workoutSession.count({ where: { trainerId: userId } }),
    prisma.activityEvent.count({ where: { userId } }),
    prisma.adminAuditLog.count({ where: { targetType: "trainer", targetId: userId } })
  ]);
  return {
    users,
    identities,
    refreshTokens,
    loginTickets,
    emailCodes,
    clients,
    exercises,
    templates,
    sessions,
    activityEvents,
    adminAuditLogs
  };
}
