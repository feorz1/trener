import type { FastifyInstance, FastifyRequest } from "fastify";
import { AuthApiError } from "../errors";
import type { AuthService } from "../services/authService";
import type { ClientProfileInput, TrainerDataRepository, WorkoutItemInput, WorkoutSessionInput, WorkoutSessionRecord, WorkoutSessionStatusRecord } from "./types";

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
    const session = await dataRepository.updateWorkoutSession(trainerId, request.params.id, input);
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
      workoutSessions: bootstrap.workoutSessions.map(serializeSession)
    };
  });

  async function setSessionStatus(request: FastifyRequest<{ Params: { id: string } }>, status: WorkoutSessionStatusRecord, eventType: string) {
    const trainerId = await requireTrainerId(request);
    const session = await dataRepository.setWorkoutSessionStatus(trainerId, request.params.id, status);
    if (!session) throw new AuthApiError("not_found", 404);
    await dataRepository.logActivity(trainerId, eventType, "workout_session", session.id);
    return serializeSession(session);
  }
}

async function assertClientBelongsToTrainer(repository: TrainerDataRepository, trainerId: string, clientId: string | null | undefined) {
  if (!clientId) return;
  if (!(await repository.getClient(trainerId, clientId))) throw new AuthApiError("forbidden", 403);
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
    muscleGroup: optionalBoundedString(body.muscleGroup, "muscleGroup", 0, 80) ?? null,
    equipment: optionalBoundedString(body.equipment, "equipment", 0, 80) ?? null,
    description: optionalBoundedString(body.description, "description", 0, 5000) ?? null
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
    clientId: nullableOptional(body.clientId, requireTitle, () => optionalString(body.clientId)),
    workoutTemplateId: nullableOptional(body.workoutTemplateId, requireTitle, () => optionalString(body.workoutTemplateId)),
    title: requireTitle ? boundedString(body.title, "title", 1, 160) : optionalBoundedString(body.title, "title", 1, 160),
    status: optionalSessionStatus(body.status),
    scheduledAt: nullableOptional(body.scheduledAt, requireTitle, () => optionalDate(body.scheduledAt)),
    startedAt: nullableOptional(body.startedAt, requireTitle, () => optionalDate(body.startedAt)),
    finishedAt: nullableOptional(body.finishedAt, requireTitle, () => optionalDate(body.finishedAt)),
    notes: nullableOptional(body.notes, requireTitle, () => optionalBoundedString(body.notes, "notes", 0, 5000)),
    items: body.items === undefined ? undefined : readItems(body.items)
  };
}

function nullableOptional<T>(input: unknown, defaultToNull: boolean, parse: () => T | undefined) {
  if (input === undefined) return defaultToNull ? null : undefined;
  return parse() ?? null;
}

function readItems(input: unknown): WorkoutItemInput[] {
  if (!Array.isArray(input)) throw new AuthApiError("validation", 400, "items must be an array");
  return input.map((item) => {
    const value = object(item, "item");
    return {
      id: optionalString(value.id) ?? null,
      exerciseId: optionalString(value.exerciseId) ?? null,
      order: requiredInteger(value.order, "order"),
      titleSnapshot: optionalBoundedString(value.titleSnapshot, "titleSnapshot", 0, 160) ?? null,
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
    equipment: exercise.equipment,
    description: exercise.description,
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
    title: session.title,
    status: session.status.toLowerCase(),
    scheduledAt: session.scheduledAt?.toISOString() ?? null,
    startedAt: session.startedAt?.toISOString() ?? null,
    finishedAt: session.finishedAt?.toISOString() ?? null,
    notes: session.notes,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    deletedAt: session.deletedAt?.toISOString() ?? null,
    items: session.items.map((item) => ({
      id: item.id,
      workoutSessionId: item.workoutSessionId,
      exerciseId: item.exerciseId,
      order: item.order,
      titleSnapshot: item.titleSnapshot,
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
  if (value === "PLANNED" || value === "IN_PROGRESS" || value === "COMPLETED" || value === "CANCELLED") return value;
  throw new AuthApiError("validation", 400);
}

function fail(message: string): never {
  throw new AuthApiError("validation", 400, message);
}
