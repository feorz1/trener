import { createHash, randomUUID } from "node:crypto";
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
  WorkoutSeriesInput,
  WorkoutSeriesMutationResult,
  WorkoutSeriesRecord,
  WorkoutSeriesSlotRecord,
  WorkoutSeriesUpdateInput,
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
import {
  addLocalDays,
  dateOnlyToLocalDate,
  generateWorkoutSeriesOccurrences,
  localDateToDateOnly,
  utcDateToLocalDate
} from "./workoutSeriesSchedule";
import {
  IdempotencyKeyReuseError,
  WorkoutSeriesVersionConflictError,
  WorkoutSessionTransitionError,
  WorkoutSessionVersionConflictError
} from "./domainErrors";

export {
  IdempotencyKeyReuseError,
  WorkoutSeriesVersionConflictError,
  WorkoutSessionTransitionError,
  WorkoutSessionVersionConflictError
} from "./domainErrors";

type StoredExerciseRecord = Omit<ExerciseRecord, "primaryMuscles" | "secondaryMuscles" | "resultType"> &
  Partial<Pick<ExerciseRecord, "primaryMuscles" | "secondaryMuscles" | "resultType">>;

export class InMemoryTrainerDataRepository implements TrainerDataRepository {
  readonly clients = new Map<string, ClientRecord>();
  readonly exercises = new Map<string, StoredExerciseRecord>();
  readonly workoutTemplates = new Map<string, WorkoutTemplateRecord>();
  readonly workoutSeries = new Map<string, WorkoutSeriesRecord>();
  readonly workoutSessions = new Map<string, WorkoutSessionRecord>();
  readonly workoutSeriesCommands = new Map<string, { requestHash: string; seriesId: string; effectiveFrom: string; resultThrough: string }>();
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
      .map(normalizeExerciseRecord);
  }

  async createExercise(trainerId: string, input: ExerciseInput & { name: string }) {
    const now = new Date();
    const exercise: ExerciseRecord = {
      id: randomUUID(),
      trainerId,
      name: input.name,
      muscleGroup: input.muscleGroup ?? null,
      primaryMuscles: input.primaryMuscles ?? null,
      secondaryMuscles: input.secondaryMuscles ?? null,
      equipment: input.equipment ?? null,
      description: input.description ?? null,
      resultType: input.resultType ?? null,
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
    return exercise && !exercise.deletedAt && (exercise.isSystem || exercise.trainerId === trainerId) ? normalizeExerciseRecord(exercise) : null;
  }

  async updateExercise(trainerId: string, id: string, input: ExerciseInput) {
    const current = this.exercises.get(id);
    if (!current || current.trainerId !== trainerId || current.isSystem || current.deletedAt) return null;
    const next: ExerciseRecord = {
      ...normalizeExerciseRecord(current),
      ...pickDefined(input),
      id,
      trainerId,
      isSystem: current.isSystem,
      createdAt: current.createdAt,
      updatedAt: new Date()
    };
    this.exercises.set(id, next);
    return clone(next);
  }

  async softDeleteExercise(trainerId: string, id: string) {
    const current = this.exercises.get(id);
    if (!current || current.trainerId !== trainerId || current.isSystem || current.deletedAt) return null;
    const next: ExerciseRecord = { ...normalizeExerciseRecord(current), deletedAt: new Date(), updatedAt: new Date() };
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

  async listWorkoutSeries(trainerId: string) {
    return Array.from(this.workoutSeries.values())
      .filter((series) => series.trainerId === trainerId && !series.deletedAt)
      .sort(sortByUpdatedAt)
      .map(cloneSeries);
  }

  async createWorkoutSeries(trainerId: string, input: WorkoutSeriesInput): Promise<WorkoutSeriesMutationResult> {
    const commandKey = seriesCommandKey(trainerId, "create", input.creationKey);
    const requestHash = hashCommand(input);
    const previousCommand = this.workoutSeriesCommands.get(commandKey);
    if (previousCommand) {
      if (previousCommand.requestHash !== requestHash) throw new IdempotencyKeyReuseError();
      const replay = this.workoutSeries.get(previousCommand.seriesId);
      if (replay && !replay.deletedAt) {
        const start = nextGenerationStart(replay, new Date());
        return {
          series: cloneSeries(replay),
          workoutSessions: this.sessionsForSeriesRange(replay.id, previousCommand.effectiveFrom, previousCommand.resultThrough),
          applied: false
        };
      }
    }
    const existing = Array.from(this.workoutSeries.values()).find(
      (series) => series.trainerId === trainerId && series.creationKey === input.creationKey && !series.deletedAt
    );
    if (existing) {
      return {
        series: cloneSeries(existing),
        workoutSessions: this.sessionsForSeriesRange(existing.id, nextGenerationStart(existing, new Date()), addLocalDays(nextGenerationStart(existing, new Date()), 90)),
        applied: false
      };
    }

    const now = new Date();
    const id = randomUUID();
    const slots = input.slots.map((slot) => createSeriesSlot(id, 1, slot, now));
    const startDate = dateOnlyToLocalDate(input.startDate);
    const today = utcDateToLocalDate(now, input.timezone);
    const series: WorkoutSeriesRecord = {
      id,
      trainerId,
      clientId: input.clientId,
      label: input.label ?? null,
      startDate: localDateToDateOnly(startDate),
      timezone: input.timezone,
      status: input.status ?? "ACTIVE",
      durationMinutes: input.durationMinutes ?? null,
      focus: input.focus ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      scheduleVersion: 1,
      version: 1,
      generationThrough: null,
      creationKey: input.creationKey,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      slots
    };
    this.workoutSeries.set(id, series);
    const generationBase = startDate > today ? startDate : today;
    await this.materializeSeries(series, addLocalDays(generationBase, 90));
    this.workoutSeriesCommands.set(commandKey, {
      requestHash,
      seriesId: id,
      effectiveFrom: generationBase,
      resultThrough: addLocalDays(generationBase, 90)
    });
    return {
      series: cloneSeries(this.workoutSeries.get(id)!),
      workoutSessions: this.sessionsForSeriesRange(id, generationBase, addLocalDays(generationBase, 90)),
      applied: true
    };
  }

  async getWorkoutSeries(trainerId: string, id: string) {
    const series = this.workoutSeries.get(id);
    return series?.trainerId === trainerId && !series.deletedAt ? cloneSeries(series) : null;
  }

  async updateWorkoutSeries(
    trainerId: string,
    id: string,
    input: WorkoutSeriesUpdateInput
  ): Promise<WorkoutSeriesMutationResult | null> {
    const commandKey = seriesCommandKey(trainerId, "update", input.mutationKey);
    const requestHash = hashCommand({ seriesId: id, ...input });
    const previousCommand = this.workoutSeriesCommands.get(commandKey);
    if (previousCommand) {
      if (previousCommand.requestHash !== requestHash || previousCommand.seriesId !== id) throw new IdempotencyKeyReuseError();
      const replay = this.workoutSeries.get(id);
      if (!replay || replay.deletedAt) return null;
      return {
        series: cloneSeries(replay),
        workoutSessions: this.sessionsForSeriesRange(id, previousCommand.effectiveFrom, previousCommand.resultThrough),
        applied: false
      };
    }
    const current = this.workoutSeries.get(id);
    if (!current || current.trainerId !== trainerId || current.deletedAt) return null;
    if (current.version !== input.expectedVersion) throw new WorkoutSeriesVersionConflictError();

    const now = new Date();
    const requestedEffectiveFrom = dateOnlyToLocalDate(input.effectiveFrom);
    const currentToday = utcDateToLocalDate(now, current.timezone);
    const effectiveFrom = requestedEffectiveFrom > currentToday ? requestedEffectiveFrom : currentToday;
    for (const [sessionId, session] of this.workoutSessions) {
      if (
        session.seriesId === id &&
        session.status === "PLANNED" &&
        session.scheduledLocalDate &&
        dateOnlyToLocalDate(session.scheduledLocalDate) >= effectiveFrom
      ) {
        this.workoutSessions.set(sessionId, { ...session, status: "SUPERSEDED", version: session.version + 1, updatedAt: now });
      }
    }

    const scheduleVersion = current.scheduleVersion + 1;
    const slotInputs = input.slots ?? current.slots;
    const slots = slotInputs.map((slot) =>
      createSeriesSlot(
        id,
        scheduleVersion,
        {
          ...slot,
          id: undefined,
          items: slot.items.map((item) => ({ ...item, id: undefined }))
        },
        now
      )
    );
    const { effectiveFrom: _effectiveFrom, expectedVersion: _expectedVersion, mutationKey: _mutationKey, slots: _slots, ...seriesChanges } = input;
    const next: WorkoutSeriesRecord = {
      ...current,
      ...pickDefined(seriesChanges),
      id,
      trainerId,
      clientId: current.clientId,
      startDate: input.startDate ?? current.startDate,
      scheduleVersion,
      version: current.version + 1,
      generationThrough: localDateToDateOnly(addLocalDays(effectiveFrom, -1)),
      createdAt: current.createdAt,
      updatedAt: now,
      slots
    };
    this.workoutSeries.set(id, next);
    if (next.status === "ACTIVE") {
      const today = utcDateToLocalDate(now, next.timezone);
      const base = effectiveFrom > today ? effectiveFrom : today;
      await this.materializeSeries(next, addLocalDays(base, 90));
    }
    const responseThrough = addLocalDays(effectiveFrom, 90);
    this.workoutSeriesCommands.set(commandKey, { requestHash, seriesId: id, effectiveFrom, resultThrough: responseThrough });
    return {
      series: cloneSeries(this.workoutSeries.get(id)!),
      workoutSessions: this.sessionsForSeriesRange(id, effectiveFrom, responseThrough),
      applied: true
    };
  }

  async ensureWorkoutSeriesOccurrences(trainerId: string, id: string, throughDate: Date, mutationKey: string) {
    const through = dateOnlyToLocalDate(throughDate);
    const commandKey = seriesCommandKey(trainerId, "ensure", mutationKey);
    const requestHash = hashCommand({ seriesId: id, throughDate });
    const previousCommand = this.workoutSeriesCommands.get(commandKey);
    if (previousCommand) {
      if (previousCommand.requestHash !== requestHash || previousCommand.seriesId !== id) throw new IdempotencyKeyReuseError();
      return this.sessionsForSeriesRange(id, previousCommand.effectiveFrom, previousCommand.resultThrough);
    }
    const series = this.workoutSeries.get(id);
    if (!series || series.trainerId !== trainerId || series.deletedAt) return null;
    await this.materializeSeries(series, through);
    const rangeStart = addLocalDays(through, -366);
    this.workoutSeriesCommands.set(commandKey, { requestHash, seriesId: id, effectiveFrom: rangeStart, resultThrough: through });
    return this.sessionsForSeriesRange(id, rangeStart, through);
  }

  async listWorkoutSessions(trainerId: string, query: ListSessionsQuery = {}) {
    return page(
      Array.from(this.workoutSessions.values())
        .filter((session) => session.trainerId === trainerId && !session.deletedAt)
        .filter((session) => (query.clientId ? session.clientId === query.clientId : true))
        .filter((session) => (query.status ? session.status === query.status : session.status !== "SUPERSEDED"))
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
      seriesId: null,
      seriesSlotId: null,
      title: input.title,
      status: input.status ?? "PLANNED",
      occurrenceKey: null,
      scheduledAt: input.scheduledAt ?? null,
      scheduledLocalDate: null,
      scheduledLocalTime: null,
      timezone: input.timezone ?? null,
      labelSnapshot: input.labelSnapshot ?? null,
      durationMinutes: input.durationMinutes ?? null,
      focus: input.focus ?? null,
      location: input.location ?? null,
      repeatDays: input.repeatDays ?? null,
      scheduleTimes: input.scheduleTimes ?? null,
      startedAt: input.startedAt ?? null,
      finishedAt: input.finishedAt ?? null,
      notes: input.notes ?? null,
      version: 1,
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
    if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
      throw new WorkoutSessionVersionConflictError();
    }
    if (current.status === "IN_PROGRESS" && input.items) {
      const now = new Date();
      const currentItemsById = new Map(current.items.map((item) => [item.id, item]));
      const next: WorkoutSessionRecord = {
        ...current,
        version: current.version + 1,
        updatedAt: now,
        items: input.items.map((item) => {
          const existing = item.id ? currentItemsById.get(item.id) : undefined;
          if (!existing) return { ...createSessionItem(item, now), workoutSessionId: id };

          return {
            ...existing,
            exerciseId: item.exerciseId ?? null,
            order: item.order,
            titleSnapshot: item.titleSnapshot ?? "Упражнение",
            resultType: item.resultType ?? null,
            day: item.day ?? null,
            supersetWithNext: item.supersetWithNext ?? null,
            plannedSetTargets: normalizePlannedSetTargets(item.plannedSetTargets),
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
    const { expectedVersion: _expectedVersion, ...changes } = input;
    const nextTimezone = input.timezone === undefined ? current.timezone : input.timezone;
    const nextScheduledAt = input.scheduledAt === undefined ? current.scheduledAt : input.scheduledAt;
    const next: WorkoutSessionRecord = {
      ...current,
      ...pickDefined(changes),
      id,
      trainerId,
      version: current.version + 1,
      createdAt: current.createdAt,
      updatedAt: now,
      scheduledLocalDate:
        input.scheduledAt !== undefined || input.timezone !== undefined
          ? nextScheduledAt && nextTimezone
            ? localDateToDateOnly(utcDateToLocalDate(nextScheduledAt, nextTimezone))
            : null
          : current.scheduledLocalDate,
      scheduledLocalTime:
        input.scheduledAt !== undefined || input.timezone !== undefined
          ? nextScheduledAt && nextTimezone
            ? new Intl.DateTimeFormat("en-GB", { timeZone: nextTimezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(nextScheduledAt)
            : null
          : current.scheduledLocalTime,
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
    assertWorkoutSessionTransition(current.status, status);
    if (current.status === status) return cloneSession(current);
    const now = new Date();
    const next = {
      ...current,
      status,
      version: current.version + 1,
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
    const today = new Date();
    for (const series of this.workoutSeries.values()) {
      if (series.trainerId === trainerId && !series.deletedAt && series.status === "ACTIVE") {
        const localToday = utcDateToLocalDate(today, series.timezone);
        await this.ensureWorkoutSeriesOccurrences(
          trainerId,
          series.id,
          localDateToDateOnly(addLocalDays(localToday, 90)),
          `bootstrap:${series.id}:v${series.version}:${localToday}`
        );
      }
    }
    const updated = (value: { updatedAt: Date }) => (updatedSince ? value.updatedAt >= updatedSince : true);
    return {
      serverTime: new Date(),
      clients: Array.from(this.clients.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && updated(item)).map(clone),
      exercises: Array.from(this.exercises.values()).filter((item) => !item.deletedAt && (item.isSystem || item.trainerId === trainerId) && updated(item)).map(normalizeExerciseRecord),
      workoutTemplates: Array.from(this.workoutTemplates.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && updated(item)).map(cloneTemplate),
      workoutSeries: Array.from(this.workoutSeries.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && updated(item)).map(cloneSeries),
      workoutSessions: Array.from(this.workoutSessions.values()).filter((item) => item.trainerId === trainerId && !item.deletedAt && item.status !== "SUPERSEDED" && updated(item)).map(cloneSession)
    };
  }

  async logActivity(userId: string | null, type: string, entityType?: string, entityId?: string, metadata?: unknown, deduplicationKey?: string) {
    if (deduplicationKey && this.activityEvents.some((event) => (event as { deduplicationKey?: string }).deduplicationKey === deduplicationKey)) return;
    this.activityEvents.push({ id: randomUUID(), userId, type, entityType, entityId, metadata, deduplicationKey, createdAt: new Date() });
  }

  private async materializeSeries(series: WorkoutSeriesRecord, throughDate: string): Promise<WorkoutSessionRecord[]> {
    if (series.status !== "ACTIVE") return [];
    const client = this.clients.get(series.clientId);
    if (!client || client.status !== "ACTIVE" || client.deletedAt) return [];
    const startDate = dateOnlyToLocalDate(series.startDate);
    const today = utcDateToLocalDate(new Date(), series.timezone);
    const firstUngeneratedDate = series.generationThrough
      ? addLocalDays(dateOnlyToLocalDate(series.generationThrough), 1)
      : startDate > today
        ? startDate
        : today;
    const effectiveStart = [firstUngeneratedDate, startDate, today].sort().at(-1)!;
    const occurrences = generateWorkoutSeriesOccurrences({
      seriesId: series.id,
      scheduleVersion: series.scheduleVersion,
      timezone: series.timezone,
      startDate: effectiveStart,
      throughDate,
      slots: series.slots.map((slot) => ({ id: slot.id, weekday: slot.weekday, localTime: slot.localTime }))
    });
    const existingKeys = new Set(
      Array.from(this.workoutSessions.values())
        .filter((session) => session.seriesId === series.id)
        .map((session) => session.occurrenceKey)
    );
    const blockedDates = new Set(
      Array.from(this.workoutSessions.values())
        .filter(
          (session) =>
            session.seriesId === series.id &&
            !session.deletedAt &&
            (session.status === "CANCELLED" || session.status === "IN_PROGRESS" || session.status === "COMPLETED") &&
            session.scheduledLocalDate
        )
        .map((session) => dateOnlyToLocalDate(session.scheduledLocalDate!))
    );
    const now = new Date();
    const created: WorkoutSessionRecord[] = [];
    for (const occurrence of occurrences) {
      if (existingKeys.has(occurrence.occurrenceKey) || blockedDates.has(occurrence.scheduledLocalDate)) continue;
      const slot = series.slots.find((candidate) => candidate.id === occurrence.seriesSlotId);
      if (!slot) continue;
      const sessionId = randomUUID();
      const items = slot.items.map((item) => ({
        ...createSessionItem({ ...item, id: undefined, day: slot.weekday }, now),
        workoutSessionId: sessionId
      }));
      const session: WorkoutSessionRecord = {
        id: sessionId,
        trainerId: series.trainerId,
        clientId: series.clientId,
        workoutTemplateId: null,
        seriesId: series.id,
        seriesSlotId: slot.id,
        title: series.label || "Тренировка",
        status: "PLANNED",
        occurrenceKey: occurrence.occurrenceKey,
        scheduledAt: occurrence.scheduledAt,
        scheduledLocalDate: localDateToDateOnly(occurrence.scheduledLocalDate),
        scheduledLocalTime: occurrence.scheduledLocalTime,
        timezone: series.timezone,
        labelSnapshot: series.label,
        durationMinutes: series.durationMinutes,
        focus: series.focus,
        location: series.location,
        repeatDays: null,
        scheduleTimes: null,
        startedAt: null,
        finishedAt: null,
        notes: series.notes,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        items
      };
      this.workoutSessions.set(sessionId, session);
      created.push(cloneSession(session));
    }
    const latest = this.workoutSeries.get(series.id);
    if (latest && (!latest.generationThrough || dateOnlyToLocalDate(latest.generationThrough) < throughDate)) {
      this.workoutSeries.set(series.id, {
        ...latest,
        generationThrough: localDateToDateOnly(throughDate),
        updatedAt: now
      });
    }
    return created;
  }

  private sessionsForSeries(seriesId: string) {
    return Array.from(this.workoutSessions.values())
      .filter((session) => session.seriesId === seriesId && session.status !== "SUPERSEDED" && !session.deletedAt)
      .sort((left, right) => (left.scheduledAt?.getTime() ?? 0) - (right.scheduledAt?.getTime() ?? 0) || left.id.localeCompare(right.id))
      .map(cloneSession);
  }

  private sessionsForSeriesRange(seriesId: string, fromDate: string, throughDate: string) {
    return this.sessionsForSeries(seriesId).filter((session) => {
      if (!session.scheduledLocalDate) return false;
      const localDate = dateOnlyToLocalDate(session.scheduledLocalDate);
      return localDate >= fromDate && localDate <= throughDate;
    });
  }
}

function seriesCommandKey(trainerId: string, operation: string, idempotencyKey: string) {
  return `${trainerId}:${operation}:${idempotencyKey}`;
}

function hashCommand(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nextGenerationStart(series: WorkoutSeriesRecord, now: Date) {
  const startDate = dateOnlyToLocalDate(series.startDate);
  const today = utcDateToLocalDate(now, series.timezone);
  return startDate > today ? startDate : today;
}

function assertWorkoutSessionTransition(current: WorkoutSessionStatusRecord, requested: WorkoutSessionStatusRecord) {
  if (current === requested) return;
  const allowed =
    (current === "PLANNED" && (requested === "IN_PROGRESS" || requested === "CANCELLED")) ||
    (current === "IN_PROGRESS" && requested === "COMPLETED");
  if (!allowed) throw new WorkoutSessionTransitionError(current, requested);
}

function createTemplateItem(input: WorkoutItemInput, now: Date): WorkoutTemplateItemRecord {
  return {
    id: input.id ?? randomUUID(),
    workoutTemplateId: "",
    exerciseId: input.exerciseId ?? null,
    order: input.order,
    titleSnapshot: input.titleSnapshot ?? null,
    resultType: input.resultType ?? null,
    day: input.day ?? null,
    supersetWithNext: input.supersetWithNext ?? null,
    plannedSetTargets: normalizePlannedSetTargets(input.plannedSetTargets),
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
    resultType: input.resultType ?? null,
    day: input.day ?? null,
    supersetWithNext: input.supersetWithNext ?? null,
    plannedSetTargets: normalizePlannedSetTargets(input.plannedSetTargets),
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

function createSeriesSlot(
  seriesId: string,
  revision: number,
  input: WorkoutSeriesInput["slots"][number],
  now: Date
): WorkoutSeriesSlotRecord {
  const id = input.id ?? randomUUID();
  return {
    id,
    seriesId,
    weekday: input.weekday,
    localTime: input.localTime,
    revision,
    order: input.order,
    createdAt: now,
    updatedAt: now,
    items: input.items.map((item) => ({
      id: randomUUID(),
      seriesId,
      seriesSlotId: id,
      exerciseId: item.exerciseId ?? null,
      order: item.order,
      titleSnapshot: item.titleSnapshot ?? "Упражнение",
      resultType: item.resultType ?? null,
      supersetWithNext: item.supersetWithNext ?? null,
      plannedSetTargets: normalizePlannedSetTargets(item.plannedSetTargets),
      plannedSets: item.plannedSets ?? null,
      plannedReps: item.plannedReps ?? null,
      plannedWeight: item.plannedWeight ?? null,
      plannedDurationSec: item.plannedDurationSec ?? null,
      restSeconds: item.restSeconds ?? null,
      notes: item.notes ?? null,
      createdAt: now,
      updatedAt: now
    }))
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

function normalizePlannedSetTargets(input: WorkoutItemInput["plannedSetTargets"]) {
  return input?.map((target) => ({
    id: target.id,
    order: target.order,
    values: target.values ?? null,
    targetWeightKg: target.targetWeightKg ?? null,
    targetReps: target.targetReps ?? null,
    targetDurationSeconds: target.targetDurationSeconds ?? null,
    targetDistanceMeters: target.targetDistanceMeters ?? null
  })) ?? null;
}

function normalizeExerciseRecord(input: StoredExerciseRecord): ExerciseRecord {
  return clone({
    ...input,
    primaryMuscles: input.primaryMuscles ?? null,
    secondaryMuscles: input.secondaryMuscles ?? null,
    resultType: input.resultType ?? null
  });
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

function cloneSeries(series: WorkoutSeriesRecord): WorkoutSeriesRecord {
  return {
    ...clone(series),
    slots: series.slots
      .map((slot) => ({ ...clone(slot), items: slot.items.map(clone).sort((left, right) => left.order - right.order) }))
      .sort((left, right) => left.order - right.order)
  };
}
