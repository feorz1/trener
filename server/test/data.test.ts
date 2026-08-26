import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "../src/config";
import { buildApi } from "../src/app";
import { InMemoryAuthRepository } from "../src/repositories/InMemoryAuthRepository";
import { InMemoryTrainerDataRepository } from "../src/data/InMemoryTrainerDataRepository";
import { InMemoryAdminRepository } from "../src/admin/InMemoryAdminRepository";
import { InMemoryAccountDeletionRepository } from "../src/accountDeletion/InMemoryAccountDeletionRepository";
import type { EmailSender, NormalizedOAuthProfile, OAuthProvider, OAuthProviderAdapter } from "../src/types";
import { SessionResultWriteQueue } from "../../src/data/remote/sessionResultWriteQueue";

class CapturingEmailSender implements EmailSender {
  sent: Array<{ email: string; code: string; ttlSeconds: number }> = [];
  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    this.sent.push(params);
  }
}

class FakeOAuthAdapter implements OAuthProviderAdapter {
  constructor(readonly provider: OAuthProvider) {}
  async getAuthorizationUrl() {
    return `https://${this.provider}.example/authorize`;
  }
  async exchangeCode() {
    return { access_token: `${this.provider}-token` };
  }
  async getProfile(): Promise<NormalizedOAuthProfile> {
    return { provider: this.provider, subject: `${this.provider}-subject` };
  }
}

function createTestApi() {
  const config = loadAuthConfig({
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
    REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
    EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
    LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
    OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
    YANDEX_CLIENT_ID: "yandex-client",
    YANDEX_CLIENT_SECRET: "yandex-secret",
    VK_CLIENT_ID: "vk-client",
    VK_CLIENT_SECRET: "vk-secret",
    EMAIL_CODE_RESEND_SECONDS: "60"
  });
  const repository = new InMemoryAuthRepository();
  const dataRepository = new InMemoryTrainerDataRepository();
  const adminRepository = new InMemoryAdminRepository();
  const accountDeletionRepository = new InMemoryAccountDeletionRepository(repository, dataRepository, adminRepository);
  const emailSender = new CapturingEmailSender();
  const app = buildApi({
    config,
    repository,
    dataRepository,
    adminRepository,
    accountDeletionRepository,
    emailSender,
    oauthAdapters: {
      yandex: new FakeOAuthAdapter("yandex"),
      vk: new FakeOAuthAdapter("vk")
    }
  });
  return { app, emailSender, dataRepository };
}

describe("trainer data backend", () => {
  it("requires auth for data endpoints", async () => {
    const { app } = createTestApi();
    const response = await app.inject({ method: "GET", url: "/clients" });
    expect(response.statusCode).toBe(401);
  });

  it("creates an idempotent infinite series, materializes dated sessions, and edits only future occurrences", async () => {
    const api = createTestApi();
    const trainer = await signInByEmail(api, "series@example.com");
    const headers = { ...authHeaders(trainer.accessToken), "idempotency-key": "series-create-2030" };
    const client = await api.app.inject({
      method: "POST",
      url: "/clients",
      headers,
      payload: { name: "Series Client" }
    });
    const exercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers,
      payload: { name: "Series Squat" }
    });
    const seriesPayload = {
      clientId: client.json().id,
      label: "Ноги",
      startDate: "2030-01-07",
      timezone: "Europe/Moscow",
      durationMinutes: 60,
      slots: [
        {
          weekday: "monday",
          localTime: "19:00",
          order: 0,
          items: [{ exerciseId: exercise.json().id, order: 0, titleSnapshot: "Понедельник" }]
        },
        {
          weekday: "wednesday",
          localTime: "18:00",
          order: 1,
          items: [{ exerciseId: exercise.json().id, order: 0, titleSnapshot: "Среда" }]
        },
        {
          weekday: "saturday",
          localTime: "12:00",
          order: 2,
          items: [{ exerciseId: exercise.json().id, order: 0, titleSnapshot: "Суббота" }]
        }
      ]
    };

    const created = await api.app.inject({ method: "POST", url: "/workout-series", headers, payload: seriesPayload });
    expect(created.statusCode).toBe(200);
    expect(created.json().series).toMatchObject({ label: "Ноги", version: 1, scheduleVersion: 1 });
    expect(created.json().workoutSessions.slice(0, 4).map((session: { scheduledLocalDate: string }) => session.scheduledLocalDate)).toEqual([
      "2030-01-07",
      "2030-01-09",
      "2030-01-12",
      "2030-01-14"
    ]);
    expect(created.json().workoutSessions.slice(0, 3).map((session: { items: Array<{ titleSnapshot: string }> }) => session.items.map((item) => item.titleSnapshot))).toEqual([
      ["Понедельник"],
      ["Среда"],
      ["Суббота"]
    ]);

    const retried = await api.app.inject({ method: "POST", url: "/workout-series", headers, payload: seriesPayload });
    expect(retried.statusCode).toBe(200);
    expect(retried.json().series.id).toBe(created.json().series.id);
    expect(retried.json().workoutSessions).toHaveLength(created.json().workoutSessions.length);
    expect(
      api.dataRepository.activityEvents.filter(
        (event) => (event as { type?: string }).type === "workout_series.created"
      )
    ).toHaveLength(1);

    const edited = await api.app.inject({
      method: "PATCH",
      url: `/workout-series/${created.json().series.id}/future`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-edit-2030" },
      payload: {
        expectedVersion: 1,
        effectiveFrom: "2030-01-09",
        label: "Техника",
        slots: [
          {
            weekday: "wednesday",
            localTime: "20:00",
            order: 0,
            items: [{ exerciseId: exercise.json().id, order: 0, titleSnapshot: "Новая среда" }]
          }
        ]
      }
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().series).toMatchObject({ label: "Техника", version: 2, scheduleVersion: 2 });
    const preservedPast = Array.from(api.dataRepository.workoutSessions.values()).find(
      (session) => session.seriesId === created.json().series.id && session.scheduledLocalDate?.toISOString().slice(0, 10) === "2030-01-07"
    );
    expect(preservedPast).toMatchObject({
      labelSnapshot: "Ноги"
    });
    expect(
      edited.json().workoutSessions
        .filter((session: { scheduledLocalDate: string }) => session.scheduledLocalDate >= "2030-01-09")
        .every((session: { scheduledLocalTime: string; labelSnapshot: string; items: Array<{ titleSnapshot: string }> }) =>
          session.scheduledLocalTime === "20:00" && session.labelSnapshot === "Техника" && session.items[0]?.titleSnapshot === "Новая среда"
        )
    ).toBe(true);

    const retriedEdit = await api.app.inject({
      method: "PATCH",
      url: `/workout-series/${created.json().series.id}/future`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-edit-2030" },
      payload: {
        expectedVersion: 1,
        effectiveFrom: "2030-01-09",
        label: "Техника",
        slots: [
          {
            weekday: "wednesday",
            localTime: "20:00",
            order: 0,
            items: [{ exerciseId: exercise.json().id, order: 0, titleSnapshot: "Новая среда" }]
          }
        ]
      }
    });
    expect(retriedEdit.statusCode).toBe(200);
    expect(retriedEdit.json().series.version).toBe(2);
    expect(retriedEdit.json().workoutSessions).toHaveLength(edited.json().workoutSessions.length);

    const cancelledOccurrence = edited.json().workoutSessions.find(
      (session: { scheduledLocalDate: string }) => session.scheduledLocalDate === "2030-01-16"
    );
    expect(cancelledOccurrence).toBeTruthy();
    const cancelled = await api.app.inject({
      method: "POST",
      url: `/workout-sessions/${cancelledOccurrence.id}/cancel`,
      headers: authHeaders(trainer.accessToken)
    });
    expect(cancelled.statusCode).toBe(200);

    const relabeled = await api.app.inject({
      method: "PATCH",
      url: `/workout-series/${created.json().series.id}/future`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-label-edit-2030" },
      payload: { expectedVersion: 2, effectiveFrom: "2030-01-16", label: "Техника 2" }
    });
    expect(relabeled.statusCode).toBe(200);
    expect(relabeled.json().series).toMatchObject({ label: "Техника 2", version: 3, scheduleVersion: 3 });
    expect(
      relabeled.json().workoutSessions
        .filter((session: { scheduledLocalDate: string; status: string }) => session.scheduledLocalDate >= "2030-01-16" && session.status === "planned")
        .every((session: { labelSnapshot: string }) => session.labelSnapshot === "Техника 2")
    ).toBe(true);
    const sessionsOnCancelledDate = Array.from(api.dataRepository.workoutSessions.values()).filter(
      (session) =>
        session.seriesId === created.json().series.id &&
        session.status !== "SUPERSEDED" &&
        session.scheduledLocalDate?.toISOString().slice(0, 10) === "2030-01-16"
    );
    expect(sessionsOnCancelledDate).toHaveLength(1);
    expect(sessionsOnCancelledDate[0]?.status).toBe("CANCELLED");

    const ensureHeaders = { ...authHeaders(trainer.accessToken), "idempotency-key": "series-ensure-2030" };
    const ensured = await api.app.inject({
      method: "POST",
      url: `/workout-series/${created.json().series.id}/ensure-occurrences`,
      headers: ensureHeaders,
      payload: { throughDate: "2030-04-07" }
    });
    expect(ensured.statusCode).toBe(200);
    const ensuredRetry = await api.app.inject({
      method: "POST",
      url: `/workout-series/${created.json().series.id}/ensure-occurrences`,
      headers: ensureHeaders,
      payload: { throughDate: "2030-04-07" }
    });
    expect(ensuredRetry.statusCode).toBe(200);
    expect(ensuredRetry.json()).toEqual(ensured.json());
    const reusedEnsureKey = await api.app.inject({
      method: "POST",
      url: `/workout-series/${created.json().series.id}/ensure-occurrences`,
      headers: ensureHeaders,
      payload: { throughDate: "2030-04-06" }
    });
    expect(reusedEnsureKey.statusCode).toBe(409);

    const beyondServerHorizon = await api.app.inject({
      method: "POST",
      url: `/workout-series/${created.json().series.id}/ensure-occurrences`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-ensure-too-far-2030" },
      payload: { throughDate: "2030-04-08" }
    });
    expect(beyondServerHorizon.statusCode).toBe(400);
    expect(beyondServerHorizon.json().message).toContain("90 days");

    const delayedFirstRetry = await api.app.inject({
      method: "PATCH",
      url: `/workout-series/${created.json().series.id}/future`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-edit-2030" },
      payload: {
        expectedVersion: 1,
        effectiveFrom: "2030-01-09",
        label: "Техника",
        slots: [{ weekday: "wednesday", localTime: "20:00", order: 0, items: [{ exerciseId: exercise.json().id, order: 0, titleSnapshot: "Новая среда" }] }]
      }
    });
    expect(delayedFirstRetry.statusCode).toBe(200);
    expect(delayedFirstRetry.json().series.version).toBe(3);

    const reusedKey = await api.app.inject({
      method: "PATCH",
      url: `/workout-series/${created.json().series.id}/future`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-edit-2030" },
      payload: { expectedVersion: 1, effectiveFrom: "2030-01-09", label: "Другой запрос" }
    });
    expect(reusedKey.statusCode).toBe(409);

    expect(
      api.dataRepository.activityEvents.filter(
        (event) => (event as { type?: string }).type === "workout_series.future_updated"
      )
    ).toHaveLength(2);

    const staleEdit = await api.app.inject({
      method: "PATCH",
      url: `/workout-series/${created.json().series.id}/future`,
      headers: { ...authHeaders(trainer.accessToken), "idempotency-key": "series-stale-edit" },
      payload: { expectedVersion: 1, effectiveFrom: "2030-01-09", label: "Устаревшее изменение" }
    });
    expect(staleEdit.statusCode).toBe(409);
    expect(staleEdit.json()).toMatchObject({ code: "conflict" });

    const oversizedPreview = await api.app.inject({
      method: "POST",
      url: "/workout-series/preview",
      headers: authHeaders(trainer.accessToken),
      payload: { ...seriesPayload, startDate: "2030-01-01", throughDate: "2032-01-01" }
    });
    expect(oversizedPreview.statusCode).toBe(400);
  });

  it("creates, updates, paginates, and soft deletes clients scoped to the trainer", async () => {
    const api = createTestApi();
    const trainerA = await signInByEmail(api, "a@example.com");
    const trainerB = await signInByEmail(api, "b@example.com");

    const created = await api.app.inject({
      method: "POST",
      url: "/clients",
      headers: authHeaders(trainerA.accessToken),
      payload: { name: "Alice", email: "alice@example.com", notes: "first" }
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({ name: "Alice", trainerId: trainerA.user.id, status: "active" });

    const hiddenFromB = await api.app.inject({ method: "GET", url: `/clients/${created.json().id}`, headers: authHeaders(trainerB.accessToken) });
    expect(hiddenFromB.statusCode).toBe(404);

    const updated = await api.app.inject({
      method: "PATCH",
      url: `/clients/${created.json().id}`,
      headers: authHeaders(trainerA.accessToken),
      payload: { name: "Alice Strong", status: "archived" }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ name: "Alice Strong", email: "alice@example.com", notes: "first", status: "archived" });

    await api.app.inject({ method: "POST", url: "/clients", headers: authHeaders(trainerA.accessToken), payload: { name: "Bob" } });
    const firstPage = await api.app.inject({ method: "GET", url: "/clients?limit=1", headers: authHeaders(trainerA.accessToken) });
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json().data).toHaveLength(1);
    expect(firstPage.json().nextCursor).toBeTruthy();

    const deleted = await api.app.inject({ method: "DELETE", url: `/clients/${created.json().id}`, headers: authHeaders(trainerA.accessToken) });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().deletedAt).toBeTruthy();
    const listAfterDelete = await api.app.inject({ method: "GET", url: "/clients", headers: authHeaders(trainerA.accessToken) });
    expect(listAfterDelete.json().data.some((client: { id: string }) => client.id === created.json().id)).toBe(false);

    const bootstrapAfterDelete = await api.app.inject({ method: "GET", url: "/sync/bootstrap", headers: authHeaders(trainerA.accessToken) });
    expect(bootstrapAfterDelete.json().clients.some((client: { id: string }) => client.id === created.json().id)).toBe(false);
    expect(api.dataRepository.activityEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: trainerA.user.id, type: "client.created", entityType: "client", entityId: created.json().id }),
        expect.objectContaining({ userId: trainerA.user.id, type: "client.updated", entityType: "client", entityId: created.json().id }),
        expect.objectContaining({ userId: trainerA.user.id, type: "client.deleted", entityType: "client", entityId: created.json().id })
      ])
    );
  });

  it("round-trips client intake profiles and preserves omitted nested values on patch", async () => {
    const api = createTestApi();
    const trainer = await signInByEmail(api, "profile@example.com");
    const headers = authHeaders(trainer.accessToken);
    const profile = {
      telegram: "@alice",
      gender: "female",
      goal: "Набрать мышечную массу",
      restrictions: ["Нельзя прыгать", "Контроль интенсивности"],
      metrics: {
        weightKg: 72.5,
        heightCm: 168,
        attendanceRate: 95
      },
      intake: {
        ageYears: 31,
        targetWeightKg: 68,
        healthConstraints: ["knees"],
        exerciseRestrictions: ["jumps"],
        activityLevel: "active",
        sleep: "sixToEight",
        workoutsPerWeek: 4,
        trainingExperience: "regular",
        sports: ["swimming"]
      }
    };

    const created = await api.app.inject({
      method: "POST",
      url: "/clients",
      headers,
      payload: { name: "Alice Profile", profile }
    });
    expect(created.statusCode).toBe(200);
    expect(created.json().profile).toEqual(profile);

    const bootstrapAfterCreate = await api.app.inject({ method: "GET", url: "/sync/bootstrap", headers });
    expect(bootstrapAfterCreate.statusCode).toBe(200);
    expect(bootstrapAfterCreate.json().clients.find((client: { id: string }) => client.id === created.json().id)?.profile).toEqual(profile);

    const updated = await api.app.inject({
      method: "PATCH",
      url: `/clients/${created.json().id}`,
      headers,
      payload: {
        profile: {
          telegram: "@alice_updated",
          metrics: { weightKg: 70 },
          intake: { workoutsPerWeek: 5, sports: ["running"], sleep: "" }
        }
      }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().profile).toEqual({
      ...profile,
      telegram: "@alice_updated",
      metrics: { ...profile.metrics, weightKg: 70 },
      intake: { ...profile.intake, workoutsPerWeek: 5, sports: ["running"], sleep: "" }
    });

    const bootstrapAfterPatch = await api.app.inject({ method: "GET", url: "/sync/bootstrap", headers });
    expect(bootstrapAfterPatch.statusCode).toBe(200);
    expect(bootstrapAfterPatch.json().clients.find((client: { id: string }) => client.id === created.json().id)?.profile).toEqual(updated.json().profile);
  });

  it("handles exercises, templates, sessions, results, completion, and scoped bootstrap", async () => {
    const api = createTestApi();
    const trainerA = await signInByEmail(api, "trainer-a@example.com");
    const trainerB = await signInByEmail(api, "trainer-b@example.com");
    const now = new Date();
    api.dataRepository.exercises.set("system-exercise", {
      id: "system-exercise",
      trainerId: null,
      name: "System Squat",
      muscleGroup: "legs",
      primaryMuscles: ["quads", "glutes"],
      secondaryMuscles: [],
      equipment: "barbell",
      description: null,
      resultType: "weight_reps",
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });

    const forbiddenSystemUpdate = await api.app.inject({
      method: "PATCH",
      url: "/exercises/system-exercise",
      headers: authHeaders(trainerA.accessToken),
      payload: { name: "Renamed" }
    });
    expect(forbiddenSystemUpdate.statusCode).toBe(403);

    const forbiddenSystemDelete = await api.app.inject({
      method: "DELETE",
      url: "/exercises/system-exercise",
      headers: authHeaders(trainerA.accessToken)
    });
    expect(forbiddenSystemDelete.statusCode).toBe(403);

    const client = await api.app.inject({ method: "POST", url: "/clients", headers: authHeaders(trainerA.accessToken), payload: { name: "Client A" } });
    const exercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers: authHeaders(trainerA.accessToken),
      payload: { name: "Bench Press", muscleGroup: "chest" }
    });
    expect(exercise.statusCode).toBe(200);

    const trainerBExercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers: authHeaders(trainerB.accessToken),
      payload: { name: "Trainer B Secret Row", muscleGroup: "back" }
    });
    expect(trainerBExercise.statusCode).toBe(200);

    const temporaryExercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers: authHeaders(trainerA.accessToken),
      payload: { name: "Temporary Exercise", muscleGroup: "legs" }
    });
    expect(temporaryExercise.statusCode).toBe(200);
    const deletedTemporaryExercise = await api.app.inject({
      method: "DELETE",
      url: `/exercises/${temporaryExercise.json().id}`,
      headers: authHeaders(trainerA.accessToken)
    });
    expect(deletedTemporaryExercise.statusCode).toBe(200);

    const exercisesForA = await api.app.inject({ method: "GET", url: "/exercises", headers: authHeaders(trainerA.accessToken) });
    expect(exercisesForA.statusCode).toBe(200);
    const exerciseIdsForA = exercisesForA.json().map((item: { id: string }) => item.id);
    expect(exerciseIdsForA).toContain("system-exercise");
    expect(exerciseIdsForA).toContain(exercise.json().id);
    expect(exerciseIdsForA).not.toContain(trainerBExercise.json().id);
    expect(exerciseIdsForA).not.toContain(temporaryExercise.json().id);

    const template = await api.app.inject({
      method: "POST",
      url: "/workout-templates",
      headers: authHeaders(trainerA.accessToken),
      payload: {
        clientId: client.json().id,
        title: "Strength",
        items: [{ exerciseId: exercise.json().id, order: 1, titleSnapshot: "Bench Press", plannedSets: 3, plannedReps: 8 }]
      }
    });
    expect(template.statusCode).toBe(200);
    expect(template.json().items[0]).toMatchObject({ order: 1, titleSnapshot: "Bench Press" });

    const session = await api.app.inject({
      method: "POST",
      url: "/workout-sessions",
      headers: authHeaders(trainerA.accessToken),
      payload: { clientId: client.json().id, workoutTemplateId: template.json().id, title: "Strength today", scheduledAt: "2026-07-05T10:00:00.000Z" }
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().items).toHaveLength(1);

    const rescheduled = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}`,
      headers: authHeaders(trainerA.accessToken),
      payload: { scheduledAt: "2026-07-06T10:00:00.000Z" }
    });
    expect(rescheduled.statusCode).toBe(200);
    expect(rescheduled.json()).toMatchObject({
      clientId: client.json().id,
      workoutTemplateId: template.json().id,
      scheduledAt: "2026-07-06T10:00:00.000Z",
      version: 2
    });

    const staleReschedule = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}`,
      headers: authHeaders(trainerA.accessToken),
      payload: { expectedVersion: 1, scheduledAt: "2026-07-07T10:00:00.000Z" }
    });
    expect(staleReschedule.statusCode).toBe(409);
    expect(staleReschedule.json()).toMatchObject({ code: "conflict" });

    const forbiddenStatusPatch = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}`,
      headers: authHeaders(trainerA.accessToken),
      payload: { status: "in_progress" }
    });
    expect(forbiddenStatusPatch.statusCode).toBe(400);
    expect(forbiddenStatusPatch.json()).toMatchObject({ code: "validation", message: "Статус тренировки меняется отдельным действием" });

    const results = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}/results`,
      headers: authHeaders(trainerA.accessToken),
      payload: { items: [{ id: session.json().items[0].id, setResults: [{ id: "11111111-1111-4111-8111-111111111111", setNumber: 1, reps: 8, weight: 60, completed: true }] }] }
    });
    expect(results.statusCode).toBe(200);
    expect(results.json().items[0].setResults[0]).toMatchObject({ reps: 8, weight: 60, completed: true });

    const legacyClientResult = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}/results`,
      headers: authHeaders(trainerA.accessToken),
      payload: {
        items: [
          {
            id: session.json().items[0].id,
            setResults: [{ id: "result-local-generated", setNumber: 1, reps: 8, weight: 60, completed: true }]
          }
        ]
      }
    });
    expect(legacyClientResult.statusCode).toBe(200);
    expect(legacyClientResult.json().items[0].setResults[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(legacyClientResult.json().items[0].setResults[0].id).not.toBe("result-local-generated");

    const updatedResults = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}/results`,
      headers: authHeaders(trainerA.accessToken),
      payload: { items: [{ id: session.json().items[0].id, setResults: [{ id: "11111111-1111-4111-8111-111111111111", setNumber: 1, reps: 9, weight: 62.5, completed: false }] }] }
    });
    expect(updatedResults.statusCode).toBe(200);
    expect(updatedResults.json().items[0].setResults).toHaveLength(1);
    expect(updatedResults.json().items[0].setResults[0]).toMatchObject({ id: "11111111-1111-4111-8111-111111111111", reps: 9, weight: 62.5, completed: false });

    const forbiddenResults = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}/results`,
      headers: authHeaders(trainerB.accessToken),
      payload: { items: [{ id: session.json().items[0].id, setResults: [{ setNumber: 1, reps: 1, completed: true }] }] }
    });
    expect(forbiddenResults.statusCode).toBe(404);

    const started = await api.app.inject({ method: "POST", url: `/workout-sessions/${session.json().id}/start`, headers: authHeaders(trainerA.accessToken) });
    expect(started.statusCode).toBe(200);
    expect(started.json().status).toBe("in_progress");

    const completed = await api.app.inject({ method: "POST", url: `/workout-sessions/${session.json().id}/complete`, headers: authHeaders(trainerA.accessToken) });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().status).toBe("completed");

    const completedAgain = await api.app.inject({ method: "POST", url: `/workout-sessions/${session.json().id}/complete`, headers: authHeaders(trainerA.accessToken) });
    expect(completedAgain.statusCode).toBe(200);
    expect(completedAgain.json().finishedAt).toBe(completed.json().finishedAt);

    const cancelCompleted = await api.app.inject({ method: "POST", url: `/workout-sessions/${session.json().id}/cancel`, headers: authHeaders(trainerA.accessToken) });
    expect(cancelCompleted.statusCode).toBe(409);

    const forbiddenCompletedStructurePatch = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}`,
      headers: authHeaders(trainerA.accessToken),
      payload: { items: [{ exerciseId: exercise.json().id, order: 1, titleSnapshot: "Changed" }] }
    });
    expect(forbiddenCompletedStructurePatch.statusCode).toBe(400);
    expect(forbiddenCompletedStructurePatch.json()).toMatchObject({ code: "validation", message: "Нельзя изменить состав уже начатой тренировки" });

    const afterBlockedPatch = await api.app.inject({ method: "GET", url: `/workout-sessions/${session.json().id}`, headers: authHeaders(trainerA.accessToken) });
    expect(afterBlockedPatch.json().items[0].setResults[0]).toMatchObject({ id: "11111111-1111-4111-8111-111111111111", reps: 9, weight: 62.5, completed: false });

    const bootstrapA = await api.app.inject({ method: "GET", url: "/sync/bootstrap", headers: authHeaders(trainerA.accessToken) });
    expect(bootstrapA.statusCode).toBe(200);
    expect(bootstrapA.json().clients.map((item: { id: string }) => item.id)).toContain(client.json().id);
    expect(bootstrapA.json().workoutTemplates.map((item: { id: string }) => item.id)).toContain(template.json().id);
    expect(bootstrapA.json().workoutSessions.map((item: { id: string }) => item.id)).toContain(session.json().id);

    const bootstrapB = await api.app.inject({ method: "GET", url: "/sync/bootstrap", headers: authHeaders(trainerB.accessToken) });
    expect(bootstrapB.statusCode).toBe(200);
    expect(bootstrapB.json().clients).toEqual([]);
    expect(bootstrapB.json().workoutTemplates).toEqual([]);
    expect(bootstrapB.json().workoutSessions).toEqual([]);
    expect(bootstrapB.json().exercises.map((item: { id: string }) => item.id)).toContain("system-exercise");
  });

  it("round-trips the additive exercise and workout contract through create, read, bootstrap, and update", async () => {
    const api = createTestApi();
    const trainer = await signInByEmail(api, "roundtrip@example.com");
    const headers = authHeaders(trainer.accessToken);
    const now = new Date();
    api.dataRepository.exercises.set("system-roundtrip", {
      id: "system-roundtrip",
      trainerId: null,
      name: "System Carry",
      muscleGroup: "full_body",
      primaryMuscles: [],
      secondaryMuscles: ["core", "grip"],
      equipment: "kettlebell",
      description: null,
      resultType: "distance_time",
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    });

    const exercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers,
      payload: {
        name: "Custom Complex",
        muscleGroup: "legacy-group",
        primaryMuscles: ["back", "biceps"],
        secondaryMuscles: [],
        equipment: "barbell",
        description: "Keep every field",
        resultType: "weight_reps_rpe"
      }
    });
    expect(exercise.statusCode).toBe(200);
    expect(exercise.json()).toMatchObject({
      muscleGroup: "legacy-group",
      primaryMuscles: ["back", "biceps"],
      secondaryMuscles: [],
      resultType: "weight_reps_rpe"
    });

    const exercises = await api.app.inject({ method: "GET", url: "/exercises", headers });
    expect(exercises.statusCode).toBe(200);
    expect(exercises.json().find((item: { id: string }) => item.id === "system-roundtrip")).toMatchObject({
      primaryMuscles: [],
      secondaryMuscles: ["core", "grip"],
      resultType: "distance_time"
    });

    const updatedExercise = await api.app.inject({
      method: "PATCH",
      url: `/exercises/${exercise.json().id}`,
      headers,
      payload: { primaryMuscles: [], secondaryMuscles: null, resultType: "reps_only" }
    });
    expect(updatedExercise.statusCode).toBe(200);
    expect(updatedExercise.json()).toMatchObject({
      muscleGroup: "legacy-group",
      primaryMuscles: [],
      secondaryMuscles: null,
      resultType: "reps_only"
    });

    const plannedSetTargets = [
      {
        id: "target-heavy",
        order: 1,
        values: { weight: 100, reps: 5, rpe: 8 },
        targetWeightKg: 100,
        targetReps: 5,
        targetDurationSeconds: 30,
        targetDistanceMeters: 10
      },
      {
        id: "target-volume",
        order: 2,
        values: { weight: 72.5, reps: 12, rpe: 7 },
        targetWeightKg: 72.5,
        targetReps: 12,
        targetDurationSeconds: 45,
        targetDistanceMeters: 20
      }
    ];
    const template = await api.app.inject({
      method: "POST",
      url: "/workout-templates",
      headers,
      payload: {
        title: "Round-trip template",
        notes: "legacy template notes",
        items: [
          {
            exerciseId: exercise.json().id,
            order: 1,
            titleSnapshot: "Custom Complex",
            resultType: "weight_reps_rpe",
            day: "monday",
            supersetWithNext: true,
            plannedSetTargets,
            plannedSets: 2,
            plannedReps: 5,
            plannedWeight: 100,
            plannedDurationSec: 30,
            restSeconds: 90,
            notes: "legacy item notes"
          }
        ]
      }
    });
    expect(template.statusCode).toBe(200);
    expect(template.json().items[0]).toMatchObject({
      resultType: "weight_reps_rpe",
      day: "monday",
      supersetWithNext: true,
      plannedSetTargets,
      plannedSets: 2,
      plannedReps: 5,
      plannedWeight: 100,
      plannedDurationSec: 30,
      notes: "legacy item notes"
    });

    const session = await api.app.inject({
      method: "POST",
      url: "/workout-sessions",
      headers,
      payload: {
        workoutTemplateId: template.json().id,
        title: "Recurring workout",
        scheduledAt: "2026-07-27T06:00:00.000Z",
        timezone: "Europe/Moscow",
        durationMinutes: 75,
        focus: "Technique",
        location: "Main gym",
        repeatDays: ["monday", "friday"],
        scheduleTimes: { monday: "09:00", friday: "18:30" },
        notes: "legacy session notes"
      }
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({
      timezone: "Europe/Moscow",
      durationMinutes: 75,
      focus: "Technique",
      location: "Main gym",
      repeatDays: ["monday", "friday"],
      scheduleTimes: { monday: "09:00", friday: "18:30" },
      notes: "legacy session notes"
    });
    expect(session.json().items[0]).toMatchObject({
      resultType: "weight_reps_rpe",
      day: "monday",
      supersetWithNext: true,
      plannedSetTargets,
      plannedSets: 2,
      plannedReps: 5,
      plannedWeight: 100,
      plannedDurationSec: 30,
      notes: "legacy item notes"
    });

    const sessionRead = await api.app.inject({ method: "GET", url: `/workout-sessions/${session.json().id}`, headers });
    expect(sessionRead.statusCode).toBe(200);
    expect(sessionRead.json()).toMatchObject(session.json());

    const updatedTargets = [
      { ...plannedSetTargets[0], values: { weight: 105, reps: 4, rpe: 9 }, targetWeightKg: 105, targetReps: 4 },
      { ...plannedSetTargets[1], values: {}, targetWeightKg: 70, targetReps: 15 }
    ];
    const updatedSession = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}`,
      headers,
      payload: {
        timezone: "Asia/Yekaterinburg",
        durationMinutes: 90,
        focus: "Volume",
        location: "Home",
        repeatDays: [],
        scheduleTimes: {},
        items: [{ ...session.json().items[0], plannedSetTargets: updatedTargets }]
      }
    });
    expect(updatedSession.statusCode).toBe(200);
    expect(updatedSession.json()).toMatchObject({
      timezone: "Asia/Yekaterinburg",
      durationMinutes: 90,
      focus: "Volume",
      location: "Home",
      repeatDays: [],
      scheduleTimes: {}
    });
    expect(updatedSession.json().items[0]).toMatchObject({
      plannedSetTargets: updatedTargets,
      plannedSets: 2,
      plannedReps: 5,
      plannedWeight: 100,
      plannedDurationSec: 30,
      notes: "legacy item notes"
    });

    const legacySession = await api.app.inject({
      method: "POST",
      url: "/workout-sessions",
      headers,
      payload: {
        title: "Legacy workout",
        notes: "legacy-only",
        items: [
          {
            exerciseId: exercise.json().id,
            order: 1,
            titleSnapshot: "Legacy item",
            plannedSets: 3,
            plannedReps: 8,
            plannedWeight: 60,
            plannedDurationSec: 20,
            notes: "legacy fields survive"
          }
        ]
      }
    });
    expect(legacySession.statusCode).toBe(200);
    expect(legacySession.json()).toMatchObject({
      timezone: null,
      durationMinutes: null,
      focus: null,
      location: null,
      repeatDays: null,
      scheduleTimes: null,
      notes: "legacy-only"
    });
    expect(legacySession.json().items[0]).toMatchObject({
      resultType: null,
      day: null,
      supersetWithNext: null,
      plannedSetTargets: null,
      plannedSets: 3,
      plannedReps: 8,
      plannedWeight: 60,
      plannedDurationSec: 20,
      notes: "legacy fields survive"
    });

    const bootstrap = await api.app.inject({ method: "GET", url: "/sync/bootstrap", headers });
    expect(bootstrap.statusCode).toBe(200);
    expect(bootstrap.json().exercises.find((item: { id: string }) => item.id === exercise.json().id)).toMatchObject({
      muscleGroup: "legacy-group",
      primaryMuscles: [],
      secondaryMuscles: null,
      resultType: "reps_only"
    });
    expect(bootstrap.json().workoutTemplates.find((item: { id: string }) => item.id === template.json().id)?.items[0]).toMatchObject({
      plannedSetTargets,
      plannedSets: 2,
      plannedReps: 5,
      plannedWeight: 100,
      plannedDurationSec: 30
    });
    expect(bootstrap.json().workoutSessions.find((item: { id: string }) => item.id === session.json().id)).toMatchObject({
      timezone: "Asia/Yekaterinburg",
      durationMinutes: 90,
      focus: "Volume",
      location: "Home",
      repeatDays: [],
      scheduleTimes: {},
      items: [expect.objectContaining({ plannedSetTargets: updatedTargets })]
    });
  });

  it("rejects invalid values in the additive workout contract", async () => {
    const api = createTestApi();
    const trainer = await signInByEmail(api, "invalid-roundtrip@example.com");
    const headers = authHeaders(trainer.accessToken);
    const invalidExercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers,
      payload: { name: "Invalid result", resultType: "unknown_result" }
    });
    expect(invalidExercise.statusCode).toBe(400);

    const invalidRecurrence = await api.app.inject({
      method: "POST",
      url: "/workout-sessions",
      headers,
      payload: { title: "Invalid recurrence", repeatDays: ["funday"] }
    });
    expect(invalidRecurrence.statusCode).toBe(400);

    const invalidTargets = await api.app.inject({
      method: "POST",
      url: "/workout-templates",
      headers,
      payload: {
        title: "Invalid targets",
        items: [{ order: 1, plannedSetTargets: [{ id: "set-1", order: 1, values: { inventedMetric: 10 } }] }]
      }
    });
    expect(invalidTargets.statusCode).toBe(400);
  });

  it("returns validation errors", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api);
    const invalid = await api.app.inject({ method: "POST", url: "/clients", headers: authHeaders(session.accessToken), payload: { name: "" } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().code).toBe("validation");

    const invalidProfile = await api.app.inject({
      method: "POST",
      url: "/clients",
      headers: authHeaders(session.accessToken),
      payload: { name: "Invalid profile", profile: { metrics: { attendanceRate: 101 }, intake: { workoutsPerWeek: 0 } } }
    });
    expect(invalidProfile.statusCode).toBe(400);
    expect(invalidProfile.json()).toMatchObject({ code: "validation", message: "profile.metrics.attendanceRate is out of range" });
  });

  it("keeps exercises added during an active session in results and completion", async () => {
    const api = createTestApi();
    const trainer = await signInByEmail(api);
    const headers = authHeaders(trainer.accessToken);
    const exercise = await api.app.inject({
      method: "POST",
      url: "/exercises",
      headers,
      payload: { name: "Active exercise", muscleGroup: "all" }
    });
    expect(exercise.statusCode).toBe(200);
    const exerciseId = exercise.json().id;
    const session = await api.app.inject({
      method: "POST",
      url: "/workout-sessions",
      headers,
      payload: {
        title: "Active composition",
        items: [{ exerciseId, order: 1, titleSnapshot: "First exercise" }]
      }
    });
    expect(session.statusCode).toBe(200);
    const started = await api.app.inject({
      method: "POST",
      url: `/workout-sessions/${session.json().id}/start`,
      headers
    });
    expect(started.statusCode).toBe(200);

    const firstItem = started.json().items[0];
    const firstResult = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}/results`,
      headers,
      payload: {
        items: [{ id: firstItem.id, setResults: [{ setNumber: 1, reps: 8, completed: true }] }]
      }
    });
    expect(firstResult.statusCode).toBe(200);

    const withAddedExercise = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}`,
      headers,
      payload: {
        items: [
          { id: firstItem.id, exerciseId: firstItem.exerciseId, order: 1, titleSnapshot: firstItem.titleSnapshot },
          { exerciseId, order: 2, titleSnapshot: "Added exercise" }
        ]
      }
    });
    expect(withAddedExercise.statusCode).toBe(200);
    expect(withAddedExercise.json().items).toHaveLength(2);
    expect(withAddedExercise.json().items[0].id).toBe(firstItem.id);
    expect(withAddedExercise.json().items[0].setResults[0]).toMatchObject({ reps: 8, completed: true });
    const addedItem = withAddedExercise.json().items[1];

    const results = await api.app.inject({
      method: "PATCH",
      url: `/workout-sessions/${session.json().id}/results`,
      headers,
      payload: {
        items: [
          { id: firstItem.id, setResults: [{ setNumber: 1, reps: 8, completed: true }] },
          { id: addedItem.id, setResults: [{ setNumber: 1, durationSec: 30, completed: true }] }
        ]
      }
    });
    expect(results.statusCode).toBe(200);
    expect(results.json().items).toHaveLength(2);
    expect(results.json().items[1].setResults[0]).toMatchObject({ durationSec: 30, completed: true });

    const completed = await api.app.inject({
      method: "POST",
      url: `/workout-sessions/${session.json().id}/complete`,
      headers
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().items).toHaveLength(2);
    expect(completed.json().items.map((item: { titleSnapshot: string }) => item.titleSnapshot)).toEqual(["First exercise", "Added exercise"]);
  });

  it("preserves independent set state across overlapping saves", async () => {
    const queue = new SessionResultWriteQueue();
    let confirmedResults = [
      { setNumber: 1, completed: true },
      { setNumber: 2, completed: false }
    ];
    const saveSet = (setNumber: number, completed: boolean) => queue.enqueue("session-1", async () => {
      const nextResults = confirmedResults.map((set) => ({ ...set }));
      const existing = nextResults.find((set) => set.setNumber === setNumber);
      if (existing) existing.completed = completed;
      else nextResults.push({ setNumber, completed });
      await Promise.resolve();
      confirmedResults = nextResults.sort((left, right) => left.setNumber - right.setNumber);
    });

    await Promise.all([
      saveSet(1, false),
      saveSet(3, true)
    ]);

    expect(confirmedResults).toEqual([
      { setNumber: 1, completed: false },
      { setNumber: 2, completed: false },
      { setNumber: 3, completed: true }
    ]);
  });
});

async function signInByEmail(api: ReturnType<typeof createTestApi>, email = "trainer@example.com") {
  const started = await api.app.inject({ method: "POST", url: "/auth/email/start", payload: { email } });
  expect(started.statusCode).toBe(200);
  const code = api.emailSender.sent.at(-1)?.code;
  expect(code).toBeTruthy();
  const verified = await api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email, code } });
  expect(verified.statusCode).toBe(200);
  return verified.json();
}

function authHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}
