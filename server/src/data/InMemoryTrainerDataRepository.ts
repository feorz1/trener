import { randomUUID } from "node:crypto";
import type {
  ClientRecord,
  ClientInput,
  ExerciseInput,
  ExerciseRecord,
  ListClientsQuery,
  ListSessionsQuery,
  SetResultInput,
  TrainerDataBootstrap,
  TrainerDataRepository,
  WorkoutItemInput,
  WorkoutSessionInput,
  WorkoutSessionItemRecord,
  WorkoutSessionRecord,
  WorkoutSessionStatusRecord,
  WorkoutSetResultRecord,
  WorkoutTemplateItemRecord,
  WorkoutTemplateInput,
  WorkoutTemplateRecord
} from "./types";
import { mergeClientProfile } from "./clientProfile";

export class InMemoryTrainerDataRepository implements TrainerDataRepository {
  readonly clients = new Map<string, ClientRecord>();
  readonly exercises = new Map<string, ExerciseRecord>();
  readonly workoutTemplates = new Map<string, WorkoutTemplateRecord>();
  readonly workoutSessions = new Map<string, WorkoutSessionRecord>();
  readonly activityEvents: unknown[] = [];

  async ready() {}

  async listClients(trainerId: string, query: ListClientsQuery = {}) {
    return page(
      Array.from(this.clients.values())
        .filter((client) => client.trainerId === trainerId)
        .filter((client) => filterDeleted(client.deletedAt, query.includeDeleted))
        .filter((client) => (query.status ? client.status === (query.status === "archived" ? "ARCHIVED" : "ACTIVE") : true))
        .filter((client) => (query.updatedSince ? client.updatedAt >= query.updatedSince : true))
        .filter((client) => (query.search ? client.name.toLowerCase().includes(query.search.toLowerCase()) : true))
        .sort(sortByUpdatedAt),
      query.limit,
      query.cursor
    );
  }

  async createClient(trainerId: string, input: ClientInput & { name: string }) {
    const now = new Date();
    const client: ClientRecord = {
      id: randomUUID(),
      trainerId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      birthDate: input.birthDate ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "ACTIVE",
      profile: mergeClientProfile({}, input.profile),
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    this.clients.set(client.id, client);
    return clone(client);
  }

  async getClient(trainerId: string, id: string, includeDeleted = false) {
    const client = this.clients.get(id);
    return client?.trainerId === trainerId && filterDeleted(client.deletedAt, includeDeleted) ? clone(client) : null;
  }

  async updateClient(trainerId: string, id: string, input: ClientInput) {
    const current = this.clients.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const { profile, ...clientInput } = input;
    const next = {
      ...current,
      ...pickDefined(clientInput),
      id,
      trainerId,
      profile: mergeClientProfile(current.profile, profile),
      createdAt: current.createdAt,
      updatedAt: new Date()
    };
    this.clients.set(id, next);
    return clone(next);
  }

  async softDeleteClient(trainerId: string, id: string) {
    const current = this.clients.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const next = { ...current, deletedAt: new Date(), updatedAt: new Date() };
    this.clients.set(id, next);
    return clone(next);
  }

  async listExercises(trainerId: string) {
    return Array.from(this.exercises.values())
      .filter((exercise) => !exercise.deletedAt && (exercise.isSystem || exercise.trainerId === trainerId))
      .sort(sortByUpdatedAt)
      .map(clone);
  }

  async createExercise(trainerId: string, input: ExerciseInput & { name: string }) {
    const now = new Date();
    const exercise: ExerciseRecord = {
      id: randomUUID(),
      trainerId,
      name: input.name,
      muscleGroup: input.muscleGroup ?? null,
      equipment: input.equipment ?? null,
      description: input.description ?? null,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    this.exercises.set(exercise.id, exercise);
    return clone(exercise);
  }

  async getExercise(trainerId: string, id: string) {
    const exercise = this.exercises.get(id);
    return exercise && !exercise.deletedAt && (exercise.isSystem || exercise.trainerId === trainerId) ? clone(exercise) : null;
  }

  async updateExercise(trainerId: string, id: string, input: ExerciseInput) {
    const current = this.exercises.get(id);
    if (!current || current.trainerId !== trainerId || current.isSystem || current.deletedAt) return null;
    const next = { ...current, ...pickDefined(input), id, trainerId, isSystem: current.isSystem, createdAt: current.createdAt, updatedAt: new Date() };
    this.exercises.set(id, next);
    return clone(next);
  }

  async softDeleteExercise(trainerId: string, id: string) {
    const current = this.exercises.get(id);
    if (!current || current.trainerId !== trainerId || current.isSystem || current.deletedAt) return null;
    const next = { ...current, deletedAt: new Date(), updatedAt: new Date() };
    this.exercises.set(id, next);
    return clone(next);
  }

  async listWorkoutTemplates(trainerId: string) {
    return Array.from(this.workoutTemplates.values())
      .filter((template) => template.trainerId === trainerId && !template.deletedAt)
      .sort(sortByUpdatedAt)
      .map(cloneTemplate);
  }

  async createWorkoutTemplate(trainerId: string, input: WorkoutTemplateInput & { title: string }) {
    const now = new Date();
    const template: WorkoutTemplateRecord = {
      id: randomUUID(),
      trainerId,
      clientId: input.clientId ?? null,
      title: input.title,
      description: input.description ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      items: (input.items ?? []).map((item) => createTemplateItem(item, now))
    };
    template.items = template.items.map((item) => ({ ...item, workoutTemplateId: template.id }));
    this.workoutTemplates.set(template.id, template);
    return cloneTemplate(template);
  }

  async getWorkoutTemplate(trainerId: string, id: string) {
    const template = this.workoutTemplates.get(id);
    return template?.trainerId === trainerId && !template.deletedAt ? cloneTemplate(template) : null;
  }

  async updateWorkoutTemplate(trainerId: string, id: string, input: WorkoutTemplateInput) {
    const current = this.workoutTemplates.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const now = new Date();
    const next: WorkoutTemplateRecord = {
      ...current,
      ...pickDefined(input),
      id,
      trainerId,
      createdAt: current.createdAt,
      updatedAt: now,
      items: input.items ? input.items.map((item) => ({ ...createTemplateItem(item, now), workoutTemplateId: id })) : current.items
    };
    this.workoutTemplates.set(id, next);
    return cloneTemplate(next);
  }

  async softDeleteWorkoutTemplate(trainerId: string, id: string) {
    const current = this.workoutTemplates.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const next = { ...current, deletedAt: new Date(), updatedAt: new Date() };
    this.workoutTemplates.set(id, next);
    return cloneTemplate(next);
  }

  async listWorkoutSessions(trainerId: string, query: ListSessionsQuery = {}) {
    return page(
      Array.from(this.workoutSessions.values())
        .filter((session) => session.trainerId === trainerId && !session.deletedAt)
        .filter((session) => (query.clientId ? session.clientId === query.clientId : true))
        .filter((session) => (query.status ? session.status === query.status : true))
        .filter((session) => (query.updatedSince ? session.updatedAt >= query.updatedSince : true))
        .filter((session) => (query.from ? (session.scheduledAt ?? session.startedAt ?? session.createdAt) >= query.from : true))
        .filter((session) => (query.to ? (session.scheduledAt ?? session.startedAt ?? session.createdAt) <= query.to : true))
        .sort(sortByUpdatedAt),
      query.limit,
      query.cursor
    );
  }

  async createWorkoutSession(trainerId: string, input: WorkoutSessionInput & { title: string }) {
    const now = new Date();
    const session: WorkoutSessionRecord = {
      id: randomUUID(),
      trainerId,
      clientId: input.clientId ?? null,
      workoutTemplateId: input.workoutTemplateId ?? null,
      title: input.title,
      status: input.status ?? "PLANNED",
      scheduledAt: input.scheduledAt ?? null,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      items: (input.items ?? []).map((item) => createSessionItem(item, now))
    };
    session.items = session.items.map((item) => ({ ...item, workoutSessionId: session.id }));
    this.workoutSessions.set(session.id, session);
    return cloneSession(session);
  }

  async getWorkoutSession(trainerId: string, id: string) {
    const session = this.workoutSessions.get(id);
    return session?.trainerId === trainerId && !session.deletedAt ? cloneSession(session) : null;
  }

  async updateWorkoutSession(trainerId: string, id: string, input: WorkoutSessionInput) {
    const current = this.workoutSessions.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    if (current.status === "IN_PROGRESS" && input.items) {
      const now = new Date();
      const currentItemsById = new Map(current.items.map((item) => [item.id, item]));
      const next: WorkoutSessionRecord = {
        ...current,
        updatedAt: now,
        items: input.items.map((item) => {
          const existing = item.id ? currentItemsById.get(item.id) : undefined;
          if (!existing) return { ...createSessionItem(item, now), workoutSessionId: id };

          return {
            ...existing,
            exerciseId: item.exerciseId ?? null,
            order: item.order,
            titleSnapshot: item.titleSnapshot ?? "Упражнение",
            plannedSets: item.plannedSets ?? null,
            plannedReps: item.plannedReps ?? null,
            plannedWeight: item.plannedWeight ?? null,
            plannedDurationSec: item.plannedDurationSec ?? null,
            restSeconds: item.restSeconds ?? null,
            notes: item.notes ?? null,
            updatedAt: now
          };
        })
      };
      this.workoutSessions.set(id, next);
      return cloneSession(next);
    }
    if (current.status !== "PLANNED") return null;
    if (input.status !== undefined && input.status !== "PLANNED") return null;
    const now = new Date();
    const next: WorkoutSessionRecord = {
      ...current,
      ...pickDefined(input),
      id,
      trainerId,
      createdAt: current.createdAt,
      updatedAt: now,
      items: input.items ? input.items.map((item) => ({ ...createSessionItem(item, now), workoutSessionId: id })) : current.items
    };
    this.workoutSessions.set(id, next);
    return cloneSession(next);
  }

  async softDeleteWorkoutSession(trainerId: string, id: string) {
    const current = this.workoutSessions.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const next = { ...current, deletedAt: new Date(), updatedAt: new Date() };
    this.workoutSessions.set(id, next);
    return cloneSession(next);
  }

  async setWorkoutSessionStatus(trainerId: string, id: string, status: WorkoutSessionStatusRecord) {
    const current = this.workoutSessions.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const now = new Date();
    const next = {
      ...current,
      status,
      startedAt: status === "IN_PROGRESS" ? (current.startedAt ?? now) : current.startedAt,
      finishedAt: status === "COMPLETED" ? (current.finishedAt ?? now) : current.finishedAt,
      updatedAt: now
    };
    this.workoutSessions.set(id, next);
    return cloneSession(next);
  }

  async updateWorkoutResults(trainerId: string, id: string, items: Array<{ id: string; setResults: SetResultInput[] }>) {
    const current = this.workoutSessions.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    const now = new Date();
    const resultsByItemId = new Map(items.map((item) => [item.id, item.setResults]));
    const next = {
      ...current,
      updatedAt: now,
      items: current.items.map((item) => {
        const setResults = resultsByItemId.get(item.id);
        if (!setResults) return item;
        return { ...item, updatedAt: now, setResults: setResults.map((result) => createSetResult(item.id, result, now)) };
      })
    };
    this.workoutSessions.set(id, next);
    return cloneSession(next);
  }

  async bootstrap(trainerId: string, updatedSince?: Date): Promise<TrainerDataBootstrap> {
    const updated = (value: { updatedAt: Date }) => (updatedSince ? value.updatedAt >= updatedSince : true);
    return {
      serverTime: new Date(),
      clients: Array.from(this.clients.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && updated(item)).map(clone),
      exercises: Array.from(this.exercises.values()).filter((item) => !item.deletedAt && (item.isSystem || item.trainerId === trainerId) && updated(item)).map(clone),
      workoutTemplates: Array.from(this.workoutTemplates.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && updated(item)).map(cloneTemplate),
      workoutSessions: Array.from(this.workoutSessions.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && updated(item)).map(cloneSession)
    };
  }

  async logActivity(userId: string | null, type: string, entityType?: string, entityId?: string, metadata?: unknown) {
    this.activityEvents.push({ id: randomUUID(), userId, type, entityType, entityId, metadata, createdAt: new Date() });
  }
}

function createTemplateItem(input: WorkoutItemInput, now: Date): WorkoutTemplateItemRecord {
  return {
    id: input.id ?? randomUUID(),
    workoutTemplateId: "",
    exerciseId: input.exerciseId ?? null,
    order: input.order,
    titleSnapshot: input.titleSnapshot ?? null,
    plannedSets: input.plannedSets ?? null,
    plannedReps: input.plannedReps ?? null,
    plannedWeight: input.plannedWeight ?? null,
    plannedDurationSec: input.plannedDurationSec ?? null,
    restSeconds: input.restSeconds ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now
  };
}

function createSessionItem(input: WorkoutItemInput, now: Date): WorkoutSessionItemRecord {
  return {
    id: input.id ?? randomUUID(),
    workoutSessionId: "",
    exerciseId: input.exerciseId ?? null,
    order: input.order,
    titleSnapshot: input.titleSnapshot ?? "Упражнение",
    plannedSets: input.plannedSets ?? null,
    plannedReps: input.plannedReps ?? null,
    plannedWeight: input.plannedWeight ?? null,
    plannedDurationSec: input.plannedDurationSec ?? null,
    restSeconds: input.restSeconds ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
    setResults: []
  };
}

function createSetResult(workoutSessionItemId: string, input: SetResultInput, now: Date): WorkoutSetResultRecord {
  return {
    id: input.id ?? randomUUID(),
    workoutSessionItemId,
    setNumber: input.setNumber,
    reps: input.reps ?? null,
    weight: input.weight ?? null,
    durationSec: input.durationSec ?? null,
    distanceMeters: input.distanceMeters ?? null,
    completed: input.completed ?? false,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now
  };
}

function page<T extends { id: string }>(items: T[], limit = 50, cursor?: string) {
  const start = cursor ? Math.max(0, items.findIndex((item) => item.id === cursor) + 1) : 0;
  const slice = items.slice(start, start + limit);
  const nextCursor = start + limit < items.length ? slice.at(-1)?.id ?? null : null;
  return { data: slice.map(clone), nextCursor };
}

function filterDeleted(deletedAt: Date | null, includeDeleted = false) {
  return includeDeleted || !deletedAt;
}

function sortByUpdatedAt(a: { updatedAt: Date }, b: { updatedAt: Date }) {
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}

function pickDefined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function clone<T>(input: T): T {
  return structuredClone(input);
}

function cloneTemplate(template: WorkoutTemplateRecord): WorkoutTemplateRecord {
  return { ...clone(template), items: template.items.map(clone).sort((a, b) => a.order - b.order) };
}

function cloneSession(session: WorkoutSessionRecord): WorkoutSessionRecord {
  return {
    ...clone(session),
    items: session.items
      .map((item) => ({ ...clone(item), setResults: item.setResults.map(clone).sort((a, b) => a.setNumber - b.setNumber) }))
      .sort((a, b) => a.order - b.order)
  };
}
