import type { FastifyInstance, FastifyRequest } from "fastify";
import { AuthApiError } from "../errors";
import type { AuthService } from "../services/authService";
import {
  REPEAT_DAYS,
  WORKOUT_METRIC_KEYS,
  WORKOUT_RESULT_TYPES,
  type ClientProfileInput,
  type PlannedSetTargetInput,
  type RepeatDayRecord,
  type TrainerDataRepository,
  type WorkoutItemInput,
  type WorkoutMetricValuesRecord,
  type WorkoutResultTypeRecord,
  type WorkoutSeriesInput,
  type WorkoutSeriesSlotInput,
  type WorkoutSessionInput,
  type WorkoutSessionRecord,
  type WorkoutSessionStatusRecord
} from "./types";
import {
  IdempotencyKeyReuseError,
  WorkoutSeriesVersionConflictError,
  WorkoutSessionTransitionError,
  WorkoutSessionVersionConflictError
} from "./domainErrors";
import {
  addLocalDays,
  assertTimezone,
  dateOnlyToLocalDate,
  DEFAULT_OCCURRENCE_WINDOW_DAYS,
  generateWorkoutSeriesOccurrences,
  localDateToDateOnly,
  utcDateToLocalDate,
  WorkoutSeriesLocalTimeError,
  WorkoutSeriesRangeError
} from "./workoutSeriesSchedule";

const repeatDaySet = new Set<string>(REPEAT_DAYS);
const workoutMetricKeySet = new Set<string>(WORKOUT_METRIC_KEYS);
const workoutResultTypeSet = new Set<string>(WORKOUT_RESULT_TYPES);
const MAX_WORKOUT_ITEMS = 200;
const MAX_SERIES_SLOT_ITEMS = 100;
const MAX_SERIES_TOTAL_ITEMS = 350;

type RegisterTrainerDataRoutesInput = {
  app: FastifyInstance;
  authService: AuthService;
  dataRepository: TrainerDataRepository;
};

export function registerTrainerDataRoutes({ app, authService, dataRepository }: RegisterTrainerDataRoutesInput) {
  async function requireTrainerId(request: FastifyRequest) {
    const user = await authService.getMe(readBearerToken(request.headers.authorization));
    return user.id;
  }

  app.get("/ready", async () => {
    await dataRepository.ready();
    return { ok: true, service: "api", time: new Date().toISOString() };
  });

  app.get("/clients", async (request) => {
    const trainerId = await requireTrainerId(request);
    const query = readQuery(request);
    return collection(
      await dataRepository.listClients(trainerId, {
        search: optionalString(query.search),
        status: optionalClientStatus(query.status),
        limit: optionalLimit(query.limit),
        cursor: optionalString(query.cursor),
        updatedSince: optionalDate(query.updatedSince),
        includeDeleted: optionalBoolean(query.includeDeleted)
      })
    );
  });

  app.post("/clients", async (request) => {
    const trainerId = await requireTrainerId(request);
    const body = readBody(request);
    const input = readClientInput(body, true);
    if (!input.name) throw new AuthApiError("validation", 400);
    const client = await dataRepository.createClient(trainerId, { ...input, name: input.name });
    await dataRepository.logActivity(trainerId, "client.created", "client", client.id);
    return serializeClient(client);
  });

  app.get<{ Params: { id: string } }>("/clients/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const client = await dataRepository.getClient(trainerId, request.params.id);
    if (!client) throw new AuthApiError("not_found", 404);
    return serializeClient(client);
  });

  app.patch<{ Params: { id: string } }>("/clients/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const client = await dataRepository.updateClient(trainerId, request.params.id, readClientInput(readBody(request), false));
    if (!client) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "client.updated", "client", client.id);
    return serializeClient(client);
  });

  app.delete<{ Params: { id: string } }>("/clients/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const client = await dataRepository.softDeleteClient(trainerId, request.params.id);
    if (!client) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "client.deleted", "client", client.id);
    return serializeClient(client);
  });

  app.get("/exercises", async (request) => {
    const trainerId = await requireTrainerId(request);
    return dataRepository.listExercises(trainerId).then((items) => items.map(serializeExercise));
  });

  app.post("/exercises", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readExerciseInput(readBody(request), true);
    if (!input.name) throw new AuthApiError("validation", 400);
    const exercise = await dataRepository.createExercise(trainerId, { ...input, name: input.name });
    await dataRepository.logActivity(trainerId, "exercise.created", "exercise", exercise.id);
    return serializeExercise(exercise);
  });

  app.get<{ Params: { id: string } }>("/exercises/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const exercise = await dataRepository.getExercise(trainerId, request.params.id);
    if (!exercise) throw new AuthApiError("not_found", 404);
    return serializeExercise(exercise);
  });

  app.patch<{ Params: { id: string } }>("/exercises/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const existing = await dataRepository.getExercise(trainerId, request.params.id);
    if (!existing) throw new AuthApiError("not_found", 404);
    if (existing.isSystem || existing.trainerId !== trainerId) throw new AuthApiError("forbidden", 403);
    const exercise = await dataRepository.updateExercise(trainerId, request.params.id, readExerciseInput(readBody(request), false));
    if (!exercise) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "exercise.updated", "exercise", exercise.id);
    return serializeExercise(exercise);
  });

  app.delete<{ Params: { id: string } }>("/exercises/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const existing = await dataRepository.getExercise(trainerId, request.params.id);
    if (!existing) throw new AuthApiError("not_found", 404);
    if (existing.isSystem || existing.trainerId !== trainerId) throw new AuthApiError("forbidden", 403);
    const exercise = await dataRepository.softDeleteExercise(trainerId, request.params.id);
    if (!exercise) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "exercise.deleted", "exercise", exercise.id);
    return serializeExercise(exercise);
  });

  app.get("/workout-templates", async (request) => {
    const trainerId = await requireTrainerId(request);
    return dataRepository.listWorkoutTemplates(trainerId).then((items) => items.map(serializeTemplate));
  });

  app.post("/workout-templates", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readTemplateInput(readBody(request), true);
    if (!input.title) throw new AuthApiError("validation", 400);
    await assertClientBelongsToTrainer(dataRepository, trainerId, input.clientId);
    await assertItemsVisible(dataRepository, trainerId, input.items);
    const template = await dataRepository.createWorkoutTemplate(trainerId, { ...input, title: input.title });
    await dataRepository.logActivity(trainerId, "workout_template.created", "workout_template", template.id);
    return serializeTemplate(template);
  });

  app.get<{ Params: { id: string } }>("/workout-templates/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const template = await dataRepository.getWorkoutTemplate(trainerId, request.params.id);
    if (!template) throw new AuthApiError("not_found", 404);
    return serializeTemplate(template);
  });

  app.patch<{ Params: { id: string } }>("/workout-templates/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readTemplateInput(readBody(request), false);
    await assertClientBelongsToTrainer(dataRepository, trainerId, input.clientId);
    await assertItemsVisible(dataRepository, trainerId, input.items);
    const template = await dataRepository.updateWorkoutTemplate(trainerId, request.params.id, input);
    if (!template) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "workout_template.updated", "workout_template", template.id);
    return serializeTemplate(template);
  });

  app.delete<{ Params: { id: string } }>("/workout-templates/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const template = await dataRepository.softDeleteWorkoutTemplate(trainerId, request.params.id);
    if (!template) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "workout_template.deleted", "workout_template", template.id);
    return serializeTemplate(template);
  });

  app.post("/workout-series/preview", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readSeriesInput(readBody(request), "preview", true);
    await assertClientBelongsToTrainer(dataRepository, trainerId, input.clientId);
    await assertItemsVisible(dataRepository, trainerId, input.slots.flatMap((slot) => slot.items));
    const throughDate = readRequiredDateOnly(readBody(request).throughDate, "throughDate");
    try {
      return {
        occurrences: generateWorkoutSeriesOccurrences({
        seriesId: "preview",
        scheduleVersion: 1,
        timezone: input.timezone,
        startDate: dateOnlyToLocalDate(input.startDate),
        throughDate: dateOnlyToLocalDate(throughDate),
        slots: input.slots.map((slot, index) => ({
          id: slot.id ?? `preview-${index}`,
          weekday: slot.weekday,
          localTime: slot.localTime
        }))
        }).map((occurrence) => ({
          seriesSlotId: occurrence.seriesSlotId,
          occurrenceKey: occurrence.occurrenceKey,
          scheduledAt: occurrence.scheduledAt.toISOString(),
          scheduledLocalDate: occurrence.scheduledLocalDate,
          scheduledLocalTime: occurrence.scheduledLocalTime
        }))
      };
    } catch (error) {
      if (error instanceof WorkoutSeriesRangeError || error instanceof WorkoutSeriesLocalTimeError) {
        throw new AuthApiError("validation", 400, error.message);
      }
      throw error;
    }
  });

  app.get("/workout-series", async (request) => {
    const trainerId = await requireTrainerId(request);
    return dataRepository.listWorkoutSeries(trainerId).then((series) => series.map(serializeSeries));
  });

  app.post("/workout-series", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readSeriesInput(readBody(request), readIdempotencyKey(request), true);
    await assertClientBelongsToTrainer(dataRepository, trainerId, input.clientId);
    await assertActiveClient(dataRepository, trainerId, input.clientId);
    await assertItemsVisible(dataRepository, trainerId, input.slots.flatMap((slot) => slot.items));
    try {
      const result = await dataRepository.createWorkoutSeries(trainerId, input);
      await dataRepository.logActivity(
        trainerId,
        "workout_series.created",
        "workout_series",
        result.series.id,
        undefined,
        `workout-series:create:${trainerId}:${input.creationKey}`
      );
      return serializeSeriesMutation(result);
    } catch (error) {
      if (error instanceof IdempotencyKeyReuseError) throw new AuthApiError("conflict", 409, error.message);
      if (error instanceof WorkoutSeriesLocalTimeError) throw new AuthApiError("validation", 400, error.message);
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>("/workout-series/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const series = await dataRepository.getWorkoutSeries(trainerId, request.params.id);
    if (!series) throw new AuthApiError("not_found", 404);
    return serializeSeries(series);
  });

  app.patch<{ Params: { id: string } }>("/workout-series/:id/future", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readSeriesUpdateInput(readBody(request), readIdempotencyKey(request));
    await assertItemsVisible(dataRepository, trainerId, input.slots?.flatMap((slot) => slot.items));
    try {
      const result = await dataRepository.updateWorkoutSeries(trainerId, request.params.id, input);
      if (!result) throw new AuthApiError("not_found", 404);
      await dataRepository.logActivity(
        trainerId,
        "workout_series.future_updated",
        "workout_series",
        result.series.id,
        undefined,
        `workout-series:update:${trainerId}:${input.mutationKey}`
      );
      return serializeSeriesMutation(result);
    } catch (error) {
      if (error instanceof IdempotencyKeyReuseError) {
        throw new AuthApiError("conflict", 409, error.message);
      }
      if (error instanceof WorkoutSeriesVersionConflictError) {
        throw new AuthApiError("conflict", 409, "Серия уже изменена на другом устройстве");
      }
      if (error instanceof WorkoutSeriesLocalTimeError) throw new AuthApiError("validation", 400, error.message);
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>("/workout-series/:id/ensure-occurrences", async (request) => {
    const trainerId = await requireTrainerId(request);
    const mutationKey = readIdempotencyKey(request);
    const throughDate = readRequiredDateOnly(readBody(request).throughDate, "throughDate");
    const series = await dataRepository.getWorkoutSeries(trainerId, request.params.id);
    if (!series) throw new AuthApiError("not_found", 404);
    const localToday = utcDateToLocalDate(new Date(), series.timezone);
    const seriesStart = dateOnlyToLocalDate(series.startDate);
    const maximumThroughDate = addLocalDays(seriesStart > localToday ? seriesStart : localToday, DEFAULT_OCCURRENCE_WINDOW_DAYS);
    if (dateOnlyToLocalDate(throughDate) > maximumThroughDate) {
      throw new AuthApiError(
        "validation",
        400,
        `Occurrence horizon cannot exceed ${DEFAULT_OCCURRENCE_WINDOW_DAYS} days`
      );
    }
    try {
      const sessions = await dataRepository.ensureWorkoutSeriesOccurrences(trainerId, request.params.id, throughDate, mutationKey);
      if (!sessions) throw new AuthApiError("not_found", 404);
      return { workoutSessions: sessions.map(serializeSession) };
    } catch (error) {
      if (error instanceof IdempotencyKeyReuseError) throw new AuthApiError("conflict", 409, error.message);
      if (error instanceof WorkoutSeriesRangeError) throw new AuthApiError("validation", 400, error.message);
      if (error instanceof WorkoutSeriesLocalTimeError) throw new AuthApiError("validation", 400, error.message);
      throw error;
    }
  });

  app.get("/workout-sessions", async (request) => {
    const trainerId = await requireTrainerId(request);
    const query = readQuery(request);
    return collection(
      await dataRepository.listWorkoutSessions(trainerId, {
        clientId: optionalString(query.clientId),
        status: optionalSessionStatus(query.status),
        from: optionalDate(query.from),
        to: optionalDate(query.to),
        limit: optionalLimit(query.limit),
        cursor: optionalString(query.cursor),
        updatedSince: optionalDate(query.updatedSince)
      }),
      serializeSession
    );
  });

  app.post("/workout-sessions", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readSessionInput(readBody(request), true);
    if (!input.title) throw new AuthApiError("validation", 400);
    await assertClientBelongsToTrainer(dataRepository, trainerId, input.clientId);
    await assertTemplateBelongsToTrainer(dataRepository, trainerId, input.workoutTemplateId);
    await assertItemsVisible(dataRepository, trainerId, input.items);
    const template = input.workoutTemplateId ? await dataRepository.getWorkoutTemplate(trainerId, input.workoutTemplateId) : null;
    const session = await dataRepository.createWorkoutSession(trainerId, {
      ...input,
      title: input.title,
      items: input.items ?? template?.items.map((item) => ({ ...item, id: undefined }))
    });
    await dataRepository.logActivity(trainerId, "workout_session.created", "workout_session", session.id);
    return serializeSession(session);
  });

  app.get<{ Params: { id: string } }>("/workout-sessions/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const session = await dataRepository.getWorkoutSession(trainerId, request.params.id);
    if (!session) throw new AuthApiError("not_found", 404);
    return serializeSession(session);
  });

  app.patch<{ Params: { id: string } }>("/workout-sessions/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const input = readSessionInput(readBody(request), false);
    const existing = await dataRepository.getWorkoutSession(trainerId, request.params.id);
    if (!existing) throw new AuthApiError("not_found", 404);
    assertWorkoutSessionPatchAllowed(existing, input);
    await assertClientBelongsToTrainer(dataRepository, trainerId, input.clientId);
    await assertTemplateBelongsToTrainer(dataRepository, trainerId, input.workoutTemplateId);
    await assertItemsVisible(dataRepository, trainerId, input.items);
    let session;
    try {
      session = await dataRepository.updateWorkoutSession(trainerId, request.params.id, input);
    } catch (error) {
      if (error instanceof WorkoutSessionVersionConflictError) {
        throw new AuthApiError("conflict", 409, "Тренировка уже изменена на другом устройстве");
      }
      throw error;
    }
    if (!session) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "workout_session.updated", "workout_session", session.id);
    return serializeSession(session);
  });

  app.delete<{ Params: { id: string } }>("/workout-sessions/:id", async (request) => {
    const trainerId = await requireTrainerId(request);
    const session = await dataRepository.softDeleteWorkoutSession(trainerId, request.params.id);
    if (!session) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "workout_session.deleted", "workout_session", session.id);
    return serializeSession(session);
  });

  app.post<{ Params: { id: string } }>("/workout-sessions/:id/start", async (request) => setSessionStatus(request, "IN_PROGRESS", "workout_session.started"));
  app.post<{ Params: { id: string } }>("/workout-sessions/:id/complete", async (request) => setSessionStatus(request, "COMPLETED", "workout_session.completed"));
  app.post<{ Params: { id: string } }>("/workout-sessions/:id/cancel", async (request) => setSessionStatus(request, "CANCELLED", "workout_session.cancelled"));

  app.patch<{ Params: { id: string } }>("/workout-sessions/:id/results", async (request) => {
    const trainerId = await requireTrainerId(request);
    const body = readBody(request);
    const rawItems = Array.isArray(body.items) ? body.items : fail("items must be an array");
    const items = rawItems.map((item) => {
      const value = object(item, "result item");
      const setResults = Array.isArray(value.setResults) ? value.setResults : fail("setResults must be an array");
      return {
        id: requiredString(value.id, "id"),
        setResults: setResults.map((result) => {
          const set = object(result, "set result");
          return {
            id: optionalPersistedUuid(set.id),
            setNumber: requiredInteger(set.setNumber, "setNumber"),
            reps: optionalInteger(set.reps),
            weight: optionalNumber(set.weight),
            durationSec: optionalInteger(set.durationSec),
            distanceMeters: optionalNumber(set.distanceMeters),
            completed: optionalBoolean(set.completed) ?? false,
            notes: optionalString(set.notes)
          };
        })
      };
    });
    const session = await dataRepository.updateWorkoutResults(trainerId, request.params.id, items);
    if (!session) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, "workout_session.results_updated", "workout_session", session.id);
    return serializeSession(session);
  });

  app.get("/sync/bootstrap", async (request) => {
    const trainerId = await requireTrainerId(request);
    const query = readQuery(request);
    const bootstrap = await dataRepository.bootstrap(trainerId, optionalDate(query.updatedSince));
    return {
      serverTime: bootstrap.serverTime.toISOString(),
      clients: bootstrap.clients.map(serializeClient),
      exercises: bootstrap.exercises.map(serializeExercise),
      workoutTemplates: bootstrap.workoutTemplates.map(serializeTemplate),
      workoutSeries: bootstrap.workoutSeries.map(serializeSeries),
      workoutSessions: bootstrap.workoutSessions.map(serializeSession)
    };
  });

  async function setSessionStatus(request: FastifyRequest<{ Params: { id: string } }>, status: WorkoutSessionStatusRecord, eventType: string) {
    const trainerId = await requireTrainerId(request);
    let session;
    try {
      session = await dataRepository.setWorkoutSessionStatus(trainerId, request.params.id, status);
    } catch (error) {
      if (error instanceof WorkoutSessionTransitionError) {
        throw new AuthApiError("conflict", 409, "Это действие недоступно в текущем состоянии тренировки");
      }
      throw error;
    }
    if (!session) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, eventType, "workout_session", session.id);
    return serializeSession(session);
  }
}

async function assertClientBelongsToTrainer(repository: TrainerDataRepository, trainerId: string, clientId: string | null | undefined) {
  if (!clientId) return;
  if (!(await repository.getClient(trainerId, clientId))) throw new AuthApiError("forbidden", 403);
}

async function assertActiveClient(repository: TrainerDataRepository, trainerId: string, clientId: string) {
  const client = await repository.getClient(trainerId, clientId);
  if (!client || client.status !== "ACTIVE") throw new AuthApiError("validation", 400, "Нельзя создать серию для архивного клиента");
}

async function assertTemplateBelongsToTrainer(repository: TrainerDataRepository, trainerId: string, templateId: string | null | undefined) {
  if (!templateId) return;
  if (!(await repository.getWorkoutTemplate(trainerId, templateId))) throw new AuthApiError("forbidden", 403);
}

async function assertItemsVisible(repository: TrainerDataRepository, trainerId: string, items: WorkoutItemInput[] | undefined) {
  if (!items) return;
  await Promise.all(
    items.map(async (item) => {
      if (!item.exerciseId) return;
      if (!(await repository.getExercise(trainerId, item.exerciseId))) throw new AuthApiError("forbidden", 403);
    })
  );
}

function assertWorkoutSessionPatchAllowed(session: WorkoutSessionRecord, input: WorkoutSessionInput) {
  if (input.status !== undefined && input.status !== "PLANNED") {
    throw new AuthApiError("validation", 400, "Статус тренировки меняется отдельным действием");
  }
  if (session.status === "PLANNED") return;

  const changesOnlyItems =
    session.status === "IN_PROGRESS" &&
    input.items !== undefined &&
    input.clientId === undefined &&
    input.workoutTemplateId === undefined &&
    input.title === undefined &&
    input.status === undefined &&
    input.scheduledAt === undefined &&
    input.timezone === undefined &&
    input.labelSnapshot === undefined &&
    input.durationMinutes === undefined &&
    input.focus === undefined &&
    input.location === undefined &&
    input.repeatDays === undefined &&
    input.scheduleTimes === undefined &&
    input.startedAt === undefined &&
    input.finishedAt === undefined &&
    input.notes === undefined;
  if (changesOnlyItems) return;

  throw new AuthApiError("validation", 400, "Нельзя изменить состав уже начатой тренировки");
}

function readClientInput(body: Record<string, unknown>, requireName: boolean) {
  const status: import("./types").ClientStatusRecord | undefined =
    optionalClientStatus(body.status) === "archived" ? "ARCHIVED" : optionalClientStatus(body.status) === "active" ? "ACTIVE" : undefined;
  return {
    name: requireName ? boundedString(body.name, "name", 1, 120) : optionalBoundedString(body.name, "name", 1, 120),
    phone: nullableOptional(body.phone, requireName, () => optionalBoundedString(body.phone, "phone", 0, 40)),
    email: nullableOptional(body.email, requireName, () => optionalEmail(body.email)),
    birthDate: nullableOptional(body.birthDate, requireName, () => optionalDate(body.birthDate)),
    notes: nullableOptional(body.notes, requireName, () => optionalBoundedString(body.notes, "notes", 0, 5000)),
    status,
    profile: body.profile === undefined ? undefined : readClientProfile(body.profile)
  };
}

function readClientProfile(input: unknown): ClientProfileInput {
  const profile = object(input, "profile");
  return {
    ...(profile.telegram !== undefined ? { telegram: boundedString(profile.telegram, "profile.telegram", 0, 100) } : {}),
    ...(profile.gender !== undefined ? { gender: clientProfileGender(profile.gender) } : {}),
    ...(profile.goal !== undefined ? { goal: boundedString(profile.goal, "profile.goal", 0, 500) } : {}),
    ...(profile.restrictions !== undefined
      ? { restrictions: boundedStringArray(profile.restrictions, "profile.restrictions", 100, 500) }
      : {}),
    ...(profile.metrics !== undefined ? { metrics: readClientProfileMetrics(profile.metrics) } : {}),
    ...(profile.intake !== undefined ? { intake: readClientIntakeProfile(profile.intake) } : {})
  };
}

function readClientProfileMetrics(input: unknown): NonNullable<ClientProfileInput["metrics"]> {
  const metrics = object(input, "profile.metrics");
  return {
    ...(metrics.weightKg !== undefined ? { weightKg: boundedNumber(metrics.weightKg, "profile.metrics.weightKg", 0, 1000) } : {}),
    ...(metrics.heightCm !== undefined ? { heightCm: boundedNumber(metrics.heightCm, "profile.metrics.heightCm", 0, 300) } : {}),
    ...(metrics.attendanceRate !== undefined
      ? { attendanceRate: boundedNumber(metrics.attendanceRate, "profile.metrics.attendanceRate", 0, 100) }
      : {})
  };
}

function readClientIntakeProfile(input: unknown): NonNullable<ClientProfileInput["intake"]> {
  const intake = object(input, "profile.intake");
  return {
    ...(intake.ageYears !== undefined ? { ageYears: boundedInteger(intake.ageYears, "profile.intake.ageYears", 0, 130) } : {}),
    ...(intake.targetWeightKg !== undefined
      ? { targetWeightKg: boundedNumber(intake.targetWeightKg, "profile.intake.targetWeightKg", 0, 1000) }
      : {}),
    ...(intake.healthConstraints !== undefined
      ? { healthConstraints: boundedStringArray(intake.healthConstraints, "profile.intake.healthConstraints", 100, 160) }
      : {}),
    ...(intake.exerciseRestrictions !== undefined
      ? { exerciseRestrictions: boundedStringArray(intake.exerciseRestrictions, "profile.intake.exerciseRestrictions", 100, 160) }
      : {}),
    ...(intake.activityLevel !== undefined
      ? { activityLevel: boundedString(intake.activityLevel, "profile.intake.activityLevel", 0, 80) }
      : {}),
    ...(intake.sleep !== undefined ? { sleep: boundedString(intake.sleep, "profile.intake.sleep", 0, 80) } : {}),
    ...(intake.workoutsPerWeek !== undefined
      ? { workoutsPerWeek: boundedInteger(intake.workoutsPerWeek, "profile.intake.workoutsPerWeek", 1, 14) }
      : {}),
    ...(intake.trainingExperience !== undefined
      ? { trainingExperience: boundedString(intake.trainingExperience, "profile.intake.trainingExperience", 0, 80) }
      : {}),
    ...(intake.sports !== undefined ? { sports: boundedStringArray(intake.sports, "profile.intake.sports", 100, 160) } : {})
  };
}

function readExerciseInput(body: Record<string, unknown>, requireName: boolean) {
  return {
    name: requireName ? boundedString(body.name, "name", 1, 120) : optionalBoundedString(body.name, "name", 1, 120),
    muscleGroup: nullableOptional(body.muscleGroup, requireName, () => optionalBoundedString(body.muscleGroup, "muscleGroup", 0, 80)),
    primaryMuscles: nullableOptional(body.primaryMuscles, requireName, () => optionalBoundedStringArray(body.primaryMuscles, "primaryMuscles", 100, 80)),
    secondaryMuscles: nullableOptional(body.secondaryMuscles, requireName, () => optionalBoundedStringArray(body.secondaryMuscles, "secondaryMuscles", 100, 80)),
    equipment: nullableOptional(body.equipment, requireName, () => optionalBoundedString(body.equipment, "equipment", 0, 80)),
    description: nullableOptional(body.description, requireName, () => optionalBoundedString(body.description, "description", 0, 5000)),
    resultType: nullableOptional(body.resultType, requireName, () => optionalWorkoutResultType(body.resultType))
  };
}

function readTemplateInput(body: Record<string, unknown>, requireTitle: boolean) {
  return {
    clientId: nullableOptional(body.clientId, requireTitle, () => optionalString(body.clientId)),
    title: requireTitle ? boundedString(body.title, "title", 1, 160) : optionalBoundedString(body.title, "title", 1, 160),
    description: nullableOptional(body.description, requireTitle, () => optionalBoundedString(body.description, "description", 0, 5000)),
    notes: nullableOptional(body.notes, requireTitle, () => optionalBoundedString(body.notes, "notes", 0, 5000)),
    items: body.items === undefined ? undefined : readItems(body.items)
  };
}

function readSessionInput(body: Record<string, unknown>, requireTitle: boolean) {
  return {
    expectedVersion: body.expectedVersion === undefined ? undefined : boundedInteger(body.expectedVersion, "expectedVersion", 1, Number.MAX_SAFE_INTEGER),
    clientId: nullableOptional(body.clientId, requireTitle, () => optionalString(body.clientId)),
    workoutTemplateId: nullableOptional(body.workoutTemplateId, requireTitle, () => optionalString(body.workoutTemplateId)),
    title: requireTitle ? boundedString(body.title, "title", 1, 160) : optionalBoundedString(body.title, "title", 1, 160),
    status: optionalSessionStatus(body.status),
    scheduledAt: nullableOptional(body.scheduledAt, requireTitle, () => optionalDate(body.scheduledAt)),
    timezone: nullableOptional(body.timezone, requireTitle, () => optionalBoundedString(body.timezone, "timezone", 1, 120)),
    labelSnapshot: nullableOptional(body.labelSnapshot, requireTitle, () => optionalBoundedString(body.labelSnapshot, "labelSnapshot", 0, 160)),
    durationMinutes: nullableOptional(body.durationMinutes, requireTitle, () => optionalBoundedInteger(body.durationMinutes, "durationMinutes", 0, 24 * 60)),
    focus: nullableOptional(body.focus, requireTitle, () => optionalBoundedString(body.focus, "focus", 0, 500)),
    location: nullableOptional(body.location, requireTitle, () => optionalBoundedString(body.location, "location", 0, 500)),
    repeatDays: nullableOptional(body.repeatDays, requireTitle, () => readRepeatDays(body.repeatDays)),
    scheduleTimes: nullableOptional(body.scheduleTimes, requireTitle, () => readScheduleTimes(body.scheduleTimes)),
    startedAt: nullableOptional(body.startedAt, requireTitle, () => optionalDate(body.startedAt)),
    finishedAt: nullableOptional(body.finishedAt, requireTitle, () => optionalDate(body.finishedAt)),
    notes: nullableOptional(body.notes, requireTitle, () => optionalBoundedString(body.notes, "notes", 0, 5000)),
    items: body.items === undefined ? undefined : readItems(body.items)
  };
}

function readSeriesInput(body: Record<string, unknown>, creationKey: string, requireClient: boolean): WorkoutSeriesInput {
  const clientId = requireClient
    ? boundedString(body.clientId, "clientId", 1, 160)
    : optionalBoundedString(body.clientId, "clientId", 1, 160) ?? "preview";
  const timezone = boundedString(body.timezone, "timezone", 1, 120);
  validateTimezone(timezone);
  return {
    clientId,
    label: body.label === null ? null : optionalBoundedString(body.label, "label", 0, 160) ?? null,
    startDate: readRequiredDateOnly(body.startDate, "startDate"),
    timezone,
    durationMinutes: body.durationMinutes === null ? null : optionalBoundedInteger(body.durationMinutes, "durationMinutes", 0, 24 * 60) ?? null,
    focus: body.focus === null ? null : optionalBoundedString(body.focus, "focus", 0, 500) ?? null,
    location: body.location === null ? null : optionalBoundedString(body.location, "location", 0, 500) ?? null,
    notes: body.notes === null ? null : optionalBoundedString(body.notes, "notes", 0, 5000) ?? null,
    creationKey,
    slots: readSeriesSlots(body.slots)
  };
}

function readSeriesUpdateInput(body: Record<string, unknown>, mutationKey: string) {
  const timezone = optionalBoundedString(body.timezone, "timezone", 1, 120);
  if (timezone) validateTimezone(timezone);
  return {
    label: body.label === undefined ? undefined : body.label === null ? null : boundedString(body.label, "label", 0, 160),
    startDate: body.startDate === undefined ? undefined : readRequiredDateOnly(body.startDate, "startDate"),
    timezone,
    status: body.status === undefined ? undefined : readSeriesStatus(body.status),
    durationMinutes:
      body.durationMinutes === undefined
        ? undefined
        : body.durationMinutes === null
          ? null
          : boundedInteger(body.durationMinutes, "durationMinutes", 0, 24 * 60),
    focus: body.focus === undefined ? undefined : body.focus === null ? null : boundedString(body.focus, "focus", 0, 500),
    location: body.location === undefined ? undefined : body.location === null ? null : boundedString(body.location, "location", 0, 500),
    notes: body.notes === undefined ? undefined : body.notes === null ? null : boundedString(body.notes, "notes", 0, 5000),
    slots: body.slots === undefined ? undefined : readSeriesSlots(body.slots),
    effectiveFrom: readRequiredDateOnly(body.effectiveFrom, "effectiveFrom"),
    expectedVersion: boundedInteger(body.expectedVersion, "expectedVersion", 1, Number.MAX_SAFE_INTEGER),
    mutationKey
  };
}

function readSeriesSlots(input: unknown): WorkoutSeriesSlotInput[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 7) {
    throw new AuthApiError("validation", 400, "slots must contain 1 to 7 schedule entries");
  }
  const slots = input.map((rawSlot, index) => {
    const slot = object(rawSlot, `slots[${index}]`);
    const localTime = boundedString(slot.localTime, `slots[${index}].localTime`, 5, 5);
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(localTime)) {
      throw new AuthApiError("validation", 400, `slots[${index}].localTime is invalid`);
    }
    return {
      id: optionalPersistedUuid(slot.id),
      weekday: optionalRepeatDay(slot.weekday) ?? fail(`slots[${index}].weekday is required`),
      localTime,
      order: slot.order === undefined ? index : boundedInteger(slot.order, `slots[${index}].order`, 0, 1000),
      items: readItems(slot.items, MAX_SERIES_SLOT_ITEMS)
    };
  });
  if (new Set(slots.map((slot) => slot.weekday)).size !== slots.length) {
    throw new AuthApiError("validation", 400, "slots must be unique by weekday");
  }
  if (slots.reduce((total, slot) => total + slot.items.length, 0) > MAX_SERIES_TOTAL_ITEMS) {
    throw new AuthApiError("validation", 400, `series cannot contain more than ${MAX_SERIES_TOTAL_ITEMS} exercise assignments`);
  }
  return slots;
}

function nullableOptional<T>(input: unknown, defaultToNull: boolean, parse: () => T | undefined) {
  if (input === undefined) return defaultToNull ? null : undefined;
  return parse() ?? null;
}

function readItems(input: unknown, maxItems = MAX_WORKOUT_ITEMS): WorkoutItemInput[] {
  if (!Array.isArray(input) || input.length > maxItems) {
    throw new AuthApiError("validation", 400, `items must be an array with at most ${maxItems} entries`);
  }
  return input.map((item) => {
    const value = object(item, "item");
    return {
      id: optionalString(value.id) ?? null,
      exerciseId: optionalString(value.exerciseId) ?? null,
      order: requiredInteger(value.order, "order"),
      titleSnapshot: optionalBoundedString(value.titleSnapshot, "titleSnapshot", 0, 160) ?? null,
      resultType: optionalWorkoutResultType(value.resultType) ?? null,
      day: optionalRepeatDay(value.day) ?? null,
      supersetWithNext: optionalBoolean(value.supersetWithNext) ?? null,
      plannedSetTargets: value.plannedSetTargets === undefined || value.plannedSetTargets === null ? null : readPlannedSetTargets(value.plannedSetTargets),
      plannedSets: optionalInteger(value.plannedSets),
      plannedReps: optionalInteger(value.plannedReps),
      plannedWeight: optionalNumber(value.plannedWeight),
      plannedDurationSec: optionalInteger(value.plannedDurationSec),
      restSeconds: optionalInteger(value.restSeconds),
      notes: optionalBoundedString(value.notes, "notes", 0, 5000) ?? null
    };
  });
}

function serializeClient(client: import("./types").ClientRecord) {
  return {
    id: client.id,
    trainerId: client.trainerId,
    name: client.name,
    phone: client.phone,
    email: client.email,
    birthDate: client.birthDate?.toISOString() ?? null,
    notes: client.notes,
    status: client.status.toLowerCase(),
    profile: client.profile,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    deletedAt: client.deletedAt?.toISOString() ?? null
  };
}

function serializeExercise(exercise: import("./types").ExerciseRecord) {
  return {
    id: exercise.id,
    trainerId: exercise.trainerId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    primaryMuscles: exercise.primaryMuscles ?? null,
    secondaryMuscles: exercise.secondaryMuscles ?? null,
    equipment: exercise.equipment,
    description: exercise.description,
    resultType: exercise.resultType ?? null,
    isSystem: exercise.isSystem,
    createdAt: exercise.createdAt.toISOString(),
    updatedAt: exercise.updatedAt.toISOString(),
    deletedAt: exercise.deletedAt?.toISOString() ?? null
  };
}

function serializeTemplate(template: import("./types").WorkoutTemplateRecord) {
  return {
    id: template.id,
    trainerId: template.trainerId,
    clientId: template.clientId,
    title: template.title,
    description: template.description,
    notes: template.notes,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    deletedAt: template.deletedAt?.toISOString() ?? null,
    items: template.items.map((item) => ({
      id: item.id,
      workoutTemplateId: item.workoutTemplateId,
      exerciseId: item.exerciseId,
      order: item.order,
      titleSnapshot: item.titleSnapshot,
      resultType: item.resultType,
      day: item.day,
      supersetWithNext: item.supersetWithNext,
      plannedSetTargets: item.plannedSetTargets,
      plannedSets: item.plannedSets,
      plannedReps: item.plannedReps,
      plannedWeight: item.plannedWeight,
      plannedDurationSec: item.plannedDurationSec,
      restSeconds: item.restSeconds,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }))
  };
}

function serializeSession(session: import("./types").WorkoutSessionRecord) {
  return {
    id: session.id,
    trainerId: session.trainerId,
    clientId: session.clientId,
    workoutTemplateId: session.workoutTemplateId,
    seriesId: session.seriesId,
    seriesSlotId: session.seriesSlotId,
    title: session.title,
    status: session.status.toLowerCase(),
    occurrenceKey: session.occurrenceKey,
    scheduledAt: session.scheduledAt?.toISOString() ?? null,
    scheduledLocalDate: session.scheduledLocalDate ? dateOnlyToLocalDate(session.scheduledLocalDate) : null,
    scheduledLocalTime: session.scheduledLocalTime,
    timezone: session.timezone,
    labelSnapshot: session.labelSnapshot,
    durationMinutes: session.durationMinutes,
    focus: session.focus,
    location: session.location,
    repeatDays: session.repeatDays,
    scheduleTimes: session.scheduleTimes,
    startedAt: session.startedAt?.toISOString() ?? null,
    finishedAt: session.finishedAt?.toISOString() ?? null,
    notes: session.notes,
    version: session.version,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    deletedAt: session.deletedAt?.toISOString() ?? null,
    items: session.items.map((item) => ({
      id: item.id,
      workoutSessionId: item.workoutSessionId,
      exerciseId: item.exerciseId,
      order: item.order,
      titleSnapshot: item.titleSnapshot,
      resultType: item.resultType,
      day: item.day,
      supersetWithNext: item.supersetWithNext,
      plannedSetTargets: item.plannedSetTargets,
      plannedSets: item.plannedSets,
      plannedReps: item.plannedReps,
      plannedWeight: item.plannedWeight,
      plannedDurationSec: item.plannedDurationSec,
      restSeconds: item.restSeconds,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      setResults: item.setResults.map((result) => ({
        id: result.id,
        workoutSessionItemId: result.workoutSessionItemId,
        setNumber: result.setNumber,
        reps: result.reps,
        weight: result.weight,
        durationSec: result.durationSec,
        distanceMeters: result.distanceMeters,
        completed: result.completed,
        notes: result.notes,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      }))
    }))
  };
}

function serializeSeries(series: import("./types").WorkoutSeriesRecord) {
  return {
    id: series.id,
    trainerId: series.trainerId,
    clientId: series.clientId,
    label: series.label,
    startDate: dateOnlyToLocalDate(series.startDate),
    timezone: series.timezone,
    status: series.status.toLowerCase(),
    durationMinutes: series.durationMinutes,
    focus: series.focus,
    location: series.location,
    notes: series.notes,
    scheduleVersion: series.scheduleVersion,
    version: series.version,
    generationThrough: series.generationThrough ? dateOnlyToLocalDate(series.generationThrough) : null,
    createdAt: series.createdAt.toISOString(),
    updatedAt: series.updatedAt.toISOString(),
    slots: series.slots.map((slot) => ({
      id: slot.id,
      seriesId: slot.seriesId,
      weekday: slot.weekday,
      localTime: slot.localTime,
      revision: slot.revision,
      order: slot.order,
      items: slot.items.map((item) => ({
        id: item.id,
        seriesId: item.seriesId,
        seriesSlotId: item.seriesSlotId,
        exerciseId: item.exerciseId,
        order: item.order,
        titleSnapshot: item.titleSnapshot,
        resultType: item.resultType,
        supersetWithNext: item.supersetWithNext,
        plannedSetTargets: item.plannedSetTargets,
        plannedSets: item.plannedSets,
        plannedReps: item.plannedReps,
        plannedWeight: item.plannedWeight,
        plannedDurationSec: item.plannedDurationSec,
        restSeconds: item.restSeconds,
        notes: item.notes
      }))
    }))
  };
}

function serializeSeriesMutation(result: import("./types").WorkoutSeriesMutationResult) {
  return {
    series: serializeSeries(result.series),
    workoutSessions: result.workoutSessions.map(serializeSession)
  };
}

function collection<T>(page: { data: T[]; nextCursor: string | null }, serialize: (item: T) => unknown = (item) => item) {
  return { data: page.data.map(serialize), nextCursor: page.nextCursor };
}

function readBearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthApiError("session_expired", 401);
  return match[1];
}

function readBody(request: FastifyRequest) {
  return object(request.body ?? {}, "body");
}

function readQuery(request: FastifyRequest) {
  return object(request.query ?? {}, "query");
}

function object(input: unknown, name: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AuthApiError("validation", 400, `${name} must be an object`);
  return input as Record<string, unknown>;
}

function boundedString(input: unknown, name: string, min: number, max: number) {
  const value = requiredString(input, name).trim();
  if (value.length < min || value.length > max) throw new AuthApiError("validation", 400, `${name} length is invalid`);
  return value;
}

function optionalBoundedString(input: unknown, name: string, min: number, max: number) {
  if (input === undefined || input === null) return undefined;
  return boundedString(input, name, min, max);
}

function requiredString(input: unknown, name: string) {
  if (typeof input !== "string") throw new AuthApiError("validation", 400, `${name} must be a string`);
  return input;
}

function optionalString(input: unknown) {
  if (input === undefined || input === null || input === "") return undefined;
  if (typeof input !== "string") throw new AuthApiError("validation", 400);
  return input;
}

function optionalPersistedUuid(input: unknown) {
  const value = optionalString(input);
  if (!value) return undefined;

  // Older clients generated prefixed result IDs; the database assigns their UUID replacements.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

function optionalEmail(input: unknown) {
  const value = optionalString(input);
  if (!value) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new AuthApiError("validation", 400, "email is invalid");
  return value;
}

function optionalDate(input: unknown) {
  const value = optionalString(input);
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AuthApiError("validation", 400, "date is invalid");
  return date;
}

function optionalBoolean(input: unknown) {
  if (input === undefined || input === null) return undefined;
  if (input === true || input === "true") return true;
  if (input === false || input === "false") return false;
  throw new AuthApiError("validation", 400, "boolean is invalid");
}

function requiredInteger(input: unknown, name: string) {
  if (typeof input !== "number" || !Number.isInteger(input)) throw new AuthApiError("validation", 400, `${name} must be an integer`);
  return input;
}

function boundedInteger(input: unknown, name: string, min: number, max: number) {
  const value = requiredInteger(input, name);
  if (value < min || value > max) throw new AuthApiError("validation", 400, `${name} is out of range`);
  return value;
}

function optionalInteger(input: unknown) {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "number" || !Number.isInteger(input)) throw new AuthApiError("validation", 400);
  return input;
}

function optionalBoundedInteger(input: unknown, name: string, min: number, max: number) {
  if (input === undefined || input === null) return undefined;
  return boundedInteger(input, name, min, max);
}

function optionalNumber(input: unknown) {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "number" || !Number.isFinite(input)) throw new AuthApiError("validation", 400);
  return input;
}

function boundedNumber(input: unknown, name: string, min: number, max: number) {
  if (typeof input !== "number" || !Number.isFinite(input)) throw new AuthApiError("validation", 400, `${name} must be a number`);
  if (input < min || input > max) throw new AuthApiError("validation", 400, `${name} is out of range`);
  return input;
}

function boundedStringArray(input: unknown, name: string, maxItems: number, maxItemLength: number) {
  if (!Array.isArray(input)) throw new AuthApiError("validation", 400, `${name} must be an array`);
  if (input.length > maxItems) throw new AuthApiError("validation", 400, `${name} has too many items`);
  return input.map((item, index) => boundedString(item, `${name}[${index}]`, 1, maxItemLength));
}

function optionalBoundedStringArray(input: unknown, name: string, maxItems: number, maxItemLength: number) {
  if (input === undefined || input === null) return undefined;
  return boundedStringArray(input, name, maxItems, maxItemLength);
}

function optionalWorkoutResultType(input: unknown): WorkoutResultTypeRecord | undefined {
  const value = optionalString(input);
  if (!value) return undefined;
  if (!workoutResultTypeSet.has(value)) throw new AuthApiError("validation", 400, "resultType is invalid");
  return value as WorkoutResultTypeRecord;
}

function optionalRepeatDay(input: unknown): RepeatDayRecord | undefined {
  const value = optionalString(input);
  if (!value) return undefined;
  if (!repeatDaySet.has(value)) throw new AuthApiError("validation", 400, "day is invalid");
  return value as RepeatDayRecord;
}

function readRepeatDays(input: unknown): RepeatDayRecord[] | undefined {
  if (input === undefined || input === null) return undefined;
  if (!Array.isArray(input)) throw new AuthApiError("validation", 400, "repeatDays must be an array");
  if (input.length > REPEAT_DAYS.length) throw new AuthApiError("validation", 400, "repeatDays has too many items");
  const days = input.map((item) => optionalRepeatDay(item) ?? fail("repeatDays contains an empty day"));
  if (new Set(days).size !== days.length) throw new AuthApiError("validation", 400, "repeatDays must be unique");
  return days;
}

function readScheduleTimes(input: unknown): Partial<Record<RepeatDayRecord, string>> | undefined {
  if (input === undefined || input === null) return undefined;
  const value = object(input, "scheduleTimes");
  const schedule: Partial<Record<RepeatDayRecord, string>> = {};
  for (const [day, time] of Object.entries(value)) {
    if (!repeatDaySet.has(day)) throw new AuthApiError("validation", 400, "scheduleTimes day is invalid");
    schedule[day as RepeatDayRecord] = boundedString(time, `scheduleTimes.${day}`, 1, 40);
  }
  return schedule;
}

function readPlannedSetTargets(input: unknown): PlannedSetTargetInput[] {
  if (!Array.isArray(input)) throw new AuthApiError("validation", 400, "plannedSetTargets must be an array");
  if (input.length > 200) throw new AuthApiError("validation", 400, "plannedSetTargets has too many items");
  return input.map((target, index) => {
    const value = object(target, `plannedSetTargets[${index}]`);
    return {
      id: boundedString(value.id, `plannedSetTargets[${index}].id`, 1, 160),
      order: boundedInteger(value.order, `plannedSetTargets[${index}].order`, 1, 1000),
      values: value.values === undefined || value.values === null ? null : readWorkoutMetricValues(value.values, index),
      targetWeightKg: optionalNumber(value.targetWeightKg) ?? null,
      targetReps: optionalNumber(value.targetReps) ?? null,
      targetDurationSeconds: optionalNumber(value.targetDurationSeconds) ?? null,
      targetDistanceMeters: optionalNumber(value.targetDistanceMeters) ?? null
    };
  });
}

function readWorkoutMetricValues(input: unknown, targetIndex: number): WorkoutMetricValuesRecord {
  const value = object(input, `plannedSetTargets[${targetIndex}].values`);
  const metrics: WorkoutMetricValuesRecord = {};
  for (const [key, metricValue] of Object.entries(value)) {
    if (!workoutMetricKeySet.has(key)) throw new AuthApiError("validation", 400, `plannedSetTargets[${targetIndex}].values contains an invalid metric`);
    if (typeof metricValue !== "number" || !Number.isFinite(metricValue)) {
      throw new AuthApiError("validation", 400, `plannedSetTargets[${targetIndex}].values.${key} must be a number`);
    }
    metrics[key as keyof WorkoutMetricValuesRecord] = metricValue;
  }
  return metrics;
}

function clientProfileGender(input: unknown): "male" | "female" {
  if (input === "male" || input === "female") return input;
  throw new AuthApiError("validation", 400, "profile.gender is invalid");
}

function optionalLimit(input: unknown) {
  if (input === undefined || input === null || input === "") return 50;
  const value = typeof input === "number" ? input : Number.parseInt(String(input), 10);
  if (!Number.isInteger(value) || value < 1 || value > 200) throw new AuthApiError("validation", 400);
  return value;
}

function optionalClientStatus(input: unknown): "active" | "archived" | undefined {
  const value = optionalString(input)?.toLowerCase();
  if (!value) return undefined;
  if (value === "active" || value === "archived") return value;
  throw new AuthApiError("validation", 400);
}

function optionalSessionStatus(input: unknown): WorkoutSessionStatusRecord | undefined {
  const value = optionalString(input)?.toUpperCase();
  if (!value) return undefined;
  if (value === "PLANNED" || value === "IN_PROGRESS" || value === "COMPLETED" || value === "CANCELLED" || value === "SUPERSEDED") return value;
  throw new AuthApiError("validation", 400);
}

function readSeriesStatus(input: unknown): import("./types").WorkoutSeriesStatusRecord {
  const value = requiredString(input, "status").toUpperCase();
  if (value === "ACTIVE" || value === "PAUSED" || value === "ENDED") return value;
  throw new AuthApiError("validation", 400, "status is invalid");
}

function readRequiredDateOnly(input: unknown, name: string) {
  const value = boundedString(input, name, 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AuthApiError("validation", 400, `${name} must use YYYY-MM-DD`);
  try {
    return localDateToDateOnly(value);
  } catch {
    throw new AuthApiError("validation", 400, `${name} is invalid`);
  }
}

function validateTimezone(timezone: string) {
  try {
    assertTimezone(timezone);
  } catch {
    throw new AuthApiError("validation", 400, "timezone is invalid");
  }
}

function readIdempotencyKey(request: FastifyRequest) {
  const header = request.headers["idempotency-key"];
  const value = Array.isArray(header) ? header[0] : header;
  return boundedString(value, "Idempotency-Key", 8, 200);
}

function fail(message: string): never {
  throw new AuthApiError("validation", 400, message);
}
