import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  REPEAT_DAYS,
  WORKOUT_METRIC_KEYS,
  WORKOUT_RESULT_TYPES,
  type PlannedSetTargetRecord,
  type RepeatDayRecord,
  type ClientRecord,
  type ClientInput,
  type ExerciseInput,
  type ExerciseRecord,
  type ListClientsQuery,
  type ListSessionsQuery,
  type SetResultInput,
  type TrainerDataBootstrap,
  type TrainerDataRepository,
  type WorkoutItemInput,
  type WorkoutSeriesInput,
  type WorkoutSeriesMutationResult,
  type WorkoutSeriesRecord,
  type WorkoutSeriesUpdateInput,
  type WorkoutSessionInput,
  type WorkoutSessionRecord,
  type WorkoutSessionStatusRecord,
  type WorkoutMetricValuesRecord,
  type WorkoutResultTypeRecord,
  type WorkoutTemplateInput,
  type WorkoutTemplateRecord
} from "./types";
import { clientProfileFromJson, mergeClientProfile } from "./clientProfile";
import {
  addLocalDays,
  dateOnlyToLocalDate,
  generateWorkoutSeriesOccurrences,
  localDateToDateOnly,
  utcDateToLocalDate,
  utcDateToLocalTime
} from "./workoutSeriesSchedule";
import {
  IdempotencyKeyReuseError,
  WorkoutSeriesVersionConflictError,
  WorkoutSessionTransitionError,
  WorkoutSessionVersionConflictError
} from "./domainErrors";

const prisma = new PrismaClient();

const templateInclude = {
  items: {
    orderBy: { order: "asc" as const }
  }
};

const sessionInclude = {
  items: {
    orderBy: { order: "asc" as const },
    include: {
      setResults: {
        orderBy: { setNumber: "asc" as const }
      }
    }
  }
};

const seriesInclude = {
  slots: {
    orderBy: { order: "asc" as const },
    include: {
      items: {
        orderBy: { order: "asc" as const }
      }
    }
  }
};

const repeatDaySet = new Set<string>(REPEAT_DAYS);
const workoutMetricKeySet = new Set<string>(WORKOUT_METRIC_KEYS);
const workoutResultTypeSet = new Set<string>(WORKOUT_RESULT_TYPES);
const expectedMigrationNames = [
  "0001_init",
  "0002_trainer_data_sync",
  "0003_admin_panel",
  "0004_system_exercise_seed_key",
  "0005_client_intake_profile",
  "0006_active_user_email_uniqueness",
  "0007_add_workout_roundtrip_contract",
  "0008_add_account_deletion_receipts",
  "0009_add_superseded_workout_session_status",
  "0010_workout_series"
] as const;

export class PrismaTrainerDataRepository implements TrainerDataRepository {
  async ready() {
    const [appliedMigrations, [schema], [seed]] = await Promise.all([
      prisma.$queryRaw<Array<{ migrationName: string }>>`
        SELECT migration_name AS "migrationName"
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `,
      prisma.$queryRaw<Array<{ receiptTable: boolean; roundtripColumns: boolean; workoutSeriesTable: boolean; workoutSeriesCommandsTable: boolean; occurrenceColumns: boolean }>>`
        SELECT
          to_regclass('public.account_deletion_receipts') IS NOT NULL AS "receiptTable",
          to_regclass('public.workout_series') IS NOT NULL AS "workoutSeriesTable",
          to_regclass('public.workout_series_commands') IS NOT NULL AS "workoutSeriesCommandsTable",
          (
            SELECT count(*) = 4
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND (table_name, column_name) IN (
                ('exercises', 'primary_muscles'),
                ('workout_template_items', 'planned_set_targets'),
                ('workout_sessions', 'repeat_days'),
                ('workout_session_items', 'planned_set_targets')
              )
          ) AS "roundtripColumns",
          (
            SELECT count(*) = 6
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'workout_sessions'
              AND column_name IN (
                'series_id',
                'series_slot_id',
                'occurrence_key',
                'scheduled_local_date',
                'scheduled_local_time',
                'version'
              )
          ) AS "occurrenceColumns"
      `,
      prisma.$queryRaw<Array<{ systemExerciseCount: bigint }>>`
        SELECT count(*) AS "systemExerciseCount"
        FROM exercises
        WHERE is_system = TRUE AND trainer_id IS NULL AND deleted_at IS NULL
      `
    ]);
    const applied = new Set(appliedMigrations.map((migration) => migration.migrationName));
    if (
      !expectedMigrationNames.every((migration) => applied.has(migration)) ||
      !schema?.receiptTable ||
      !schema.workoutSeriesTable ||
      !schema.workoutSeriesCommandsTable ||
      !schema.occurrenceColumns ||
      !schema.roundtripColumns ||
      !seed ||
      seed.systemExerciseCount === 0n
    ) {
      throw new Error("Database schema or required system seed is not ready");
    }
  }

  async listClients(trainerId: string, query: ListClientsQuery = {}) {
    const take = query.limit ?? 50;
    const where: Prisma.ClientWhereInput = {
      trainerId,
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status === "archived" ? "ARCHIVED" : "ACTIVE" } : {}),
      ...(query.updatedSince ? { updatedAt: { gte: query.updatedSince } } : {}),
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" } } : {})
    };
    const data = await prisma.client.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
    });
    const hasNext = data.length > take;
    const page = hasNext ? data.slice(0, take) : data;
    return { data: page.map(mapClient), nextCursor: hasNext ? page.at(-1)?.id ?? null : null };
  }

  async createClient(trainerId: string, input: ClientInput & { name: string }) {
    return mapClient(
      await prisma.client.create({
        data: {
          trainerId,
          name: input.name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          birthDate: input.birthDate ?? null,
          notes: input.notes ?? null,
          status: input.status ?? "ACTIVE",
          profile: toPrismaProfile(mergeClientProfile({}, input.profile))
        }
      })
    );
  }

  async getClient(trainerId: string, id: string, includeDeleted = false) {
    const client = await prisma.client.findFirst({ where: { id, trainerId, ...(includeDeleted ? {} : { deletedAt: null }) } });
    return client ? mapClient(client) : null;
  }

  async updateClient(trainerId: string, id: string, input: ClientInput) {
    const current = await this.getClient(trainerId, id);
    if (!current) return null;
    return mapClient(
      await prisma.client.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.profile !== undefined ? { profile: toPrismaProfile(mergeClientProfile(current.profile, input.profile)) } : {})
        }
      })
    );
  }

  async softDeleteClient(trainerId: string, id: string) {
    const current = await this.getClient(trainerId, id);
    if (!current) return null;
    return mapClient(await prisma.client.update({ where: { id }, data: { deletedAt: new Date() } }));
  }

  async listExercises(trainerId: string) {
    return (
      await prisma.exercise.findMany({
        where: {
          deletedAt: null,
          OR: [{ isSystem: true }, { trainerId }]
        },
        orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }, { id: "asc" }]
      })
    ).map(mapExercise);
  }

  async createExercise(trainerId: string, input: ExerciseInput & { name: string }) {
    return mapExercise(
      await prisma.exercise.create({
        data: {
          trainerId,
          name: input.name,
          muscleGroup: input.muscleGroup ?? null,
          primaryMuscles: toNullablePrismaJson(input.primaryMuscles),
          secondaryMuscles: toNullablePrismaJson(input.secondaryMuscles),
          equipment: input.equipment ?? null,
          description: input.description ?? null,
          resultType: input.resultType ?? null,
          isSystem: false
        }
      })
    );
  }

  async getExercise(trainerId: string, id: string) {
    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ isSystem: true }, { trainerId }]
      }
    });
    return exercise ? mapExercise(exercise) : null;
  }

  async updateExercise(trainerId: string, id: string, input: ExerciseInput) {
    const current = await prisma.exercise.findFirst({ where: { id, trainerId, isSystem: false, deletedAt: null } });
    if (!current) return null;
    return mapExercise(
      await prisma.exercise.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.muscleGroup !== undefined ? { muscleGroup: input.muscleGroup } : {}),
          ...(input.primaryMuscles !== undefined ? { primaryMuscles: toNullablePrismaJson(input.primaryMuscles) } : {}),
          ...(input.secondaryMuscles !== undefined ? { secondaryMuscles: toNullablePrismaJson(input.secondaryMuscles) } : {}),
          ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.resultType !== undefined ? { resultType: input.resultType } : {})
        }
      })
    );
  }

  async softDeleteExercise(trainerId: string, id: string) {
    const current = await prisma.exercise.findFirst({ where: { id, trainerId, isSystem: false, deletedAt: null } });
    if (!current) return null;
    return mapExercise(await prisma.exercise.update({ where: { id }, data: { deletedAt: new Date() } }));
  }

  async listWorkoutTemplates(trainerId: string) {
    return (
      await prisma.workoutTemplate.findMany({
        where: { trainerId, deletedAt: null },
        include: templateInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
      })
    ).map(mapTemplate);
  }

  async createWorkoutTemplate(trainerId: string, input: WorkoutTemplateInput & { title: string }) {
    return mapTemplate(
      await prisma.workoutTemplate.create({
        data: {
          trainerId,
          clientId: input.clientId ?? null,
          title: input.title,
          description: input.description ?? null,
          notes: input.notes ?? null,
          items: {
            create: (input.items ?? []).map(itemData)
          }
        },
        include: templateInclude
      })
    );
  }

  async getWorkoutTemplate(trainerId: string, id: string) {
    const template = await prisma.workoutTemplate.findFirst({ where: { id, trainerId, deletedAt: null }, include: templateInclude });
    return template ? mapTemplate(template) : null;
  }

  async updateWorkoutTemplate(trainerId: string, id: string, input: WorkoutTemplateInput) {
    const current = await this.getWorkoutTemplate(trainerId, id);
    if (!current) return null;
    return mapTemplate(
      await prisma.$transaction(async (tx) => {
        if (input.items) {
          await tx.workoutTemplateItem.deleteMany({ where: { workoutTemplateId: id } });
        }
        return tx.workoutTemplate.update({
          where: { id },
          data: {
            ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.items ? { items: { create: input.items.map(itemData) } } : {})
          },
          include: templateInclude
        });
      })
    );
  }

  async softDeleteWorkoutTemplate(trainerId: string, id: string) {
    const current = await this.getWorkoutTemplate(trainerId, id);
    if (!current) return null;
    return mapTemplate(await prisma.workoutTemplate.update({ where: { id }, data: { deletedAt: new Date() }, include: templateInclude }));
  }

  async listWorkoutSeries(trainerId: string) {
    return (
      await prisma.workoutSeries.findMany({
        where: { trainerId, deletedAt: null },
        include: seriesInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
      })
    ).map(mapSeries);
  }

  async createWorkoutSeries(trainerId: string, input: WorkoutSeriesInput): Promise<WorkoutSeriesMutationResult> {
    const requestHash = hashCommand(input);
    const previousCommand = await this.findSeriesCommand(trainerId, "create", input.creationKey);
    if (previousCommand) return this.replaySeriesCommand(trainerId, previousCommand, requestHash);

    try {
      return await prisma.$transaction(async (tx) => {
          const created = await tx.workoutSeries.create({
            data: {
              trainerId,
              clientId: input.clientId,
              label: input.label ?? null,
              startDate: input.startDate,
              timezone: input.timezone,
              status: input.status ?? "ACTIVE",
              durationMinutes: input.durationMinutes ?? null,
              focus: input.focus ?? null,
              location: input.location ?? null,
              notes: input.notes ?? null,
              creationKey: input.creationKey
            }
          });
          for (const slotInput of input.slots) {
            const slot = await tx.workoutSeriesSlot.create({
              data: {
                id: slotInput.id,
                seriesId: created.id,
                weekday: slotInput.weekday,
                localTime: slotInput.localTime,
                revision: 1,
                order: slotInput.order
              }
            });
            if (slotInput.items.length > 0) {
              await tx.workoutSeriesItem.createMany({
                data: slotInput.items.map((item) => seriesItemData(created.id, slot.id, item))
              });
            }
          }
          const startDate = dateOnlyToLocalDate(created.startDate);
          const today = utcDateToLocalDate(new Date(), created.timezone);
          const generationBase = startDate > today ? startDate : today;
          const through = addLocalDays(generationBase, 90);
          await this.materializeSeriesThrough(tx, trainerId, created.id, localDateToDateOnly(through));
          await tx.workoutSeriesCommand.create({
            data: {
              trainerId,
              seriesId: created.id,
              operation: "create",
              idempotencyKey: input.creationKey,
              requestHash,
              effectiveFrom: localDateToDateOnly(generationBase),
              resultThrough: localDateToDateOnly(through),
              resultVersion: created.version
            }
          });
          const series = await tx.workoutSeries.findUniqueOrThrow({ where: { id: created.id }, include: seriesInclude });
          const workoutSessions = await this.listSeriesSessionsRangeInTransaction(tx, created.id, generationBase, through);
          return { series: mapSeries(series), workoutSessions, applied: true };
        });
    } catch (error) {
      if (!isPrismaErrorCode(error, "P2002")) throw error;
      const concurrentCommand = await this.findSeriesCommand(trainerId, "create", input.creationKey);
      if (concurrentCommand) return this.replaySeriesCommand(trainerId, concurrentCommand, requestHash);
      const concurrentSeries = await prisma.workoutSeries.findUnique({
        where: { trainerId_creationKey: { trainerId, creationKey: input.creationKey } },
        include: seriesInclude
      });
      if (!concurrentSeries) throw error;
      const start = nextGenerationStart(mapSeries(concurrentSeries), new Date());
      return {
        series: mapSeries(concurrentSeries),
        workoutSessions: await this.listSeriesSessionsRange(concurrentSeries.id, start, addLocalDays(start, 90)),
        applied: false
      };
    }
  }

  async getWorkoutSeries(trainerId: string, id: string) {
    const series = await prisma.workoutSeries.findFirst({
      where: { id, trainerId, deletedAt: null },
      include: seriesInclude
    });
    return series ? mapSeries(series) : null;
  }

  async updateWorkoutSeries(
    trainerId: string,
    id: string,
    input: WorkoutSeriesUpdateInput
  ): Promise<WorkoutSeriesMutationResult | null> {
    const requestHash = hashCommand({ seriesId: id, ...input });
    const previousCommand = await this.findSeriesCommand(trainerId, "update", input.mutationKey);
    if (previousCommand) return this.replaySeriesCommand(trainerId, previousCommand, requestHash);

    const current = await prisma.workoutSeries.findFirst({ where: { id, trainerId, deletedAt: null }, include: seriesInclude });
    if (!current) return null;
    if (current.version !== input.expectedVersion) throw new WorkoutSeriesVersionConflictError();

    const requestedEffectiveFrom = dateOnlyToLocalDate(input.effectiveFrom);
    const currentToday = utcDateToLocalDate(new Date(), current.timezone);
    const effectiveFrom = requestedEffectiveFrom > currentToday ? requestedEffectiveFrom : currentToday;
    const effectiveFromDate = localDateToDateOnly(effectiveFrom);
    const scheduleVersion = current.scheduleVersion + 1;
    const currentMapped = mapSeries(current);
    const slotInputs = input.slots ?? currentMapped.slots;
    try {
      return await prisma.$transaction(async (tx) => {
        const claimed = await tx.workoutSeries.updateMany({
          where: { id, trainerId, version: input.expectedVersion, deletedAt: null },
          data: {
            version: { increment: 1 }
          }
        });
        if (claimed.count !== 1) throw new WorkoutSeriesVersionConflictError();

        await tx.workoutSession.updateMany({
          where: {
            seriesId: id,
            status: "PLANNED",
            scheduledLocalDate: { gte: effectiveFromDate },
            deletedAt: null
          },
          data: { status: "SUPERSEDED", version: { increment: 1 } }
        });

        for (const slotInput of slotInputs) {
          const slot = await tx.workoutSeriesSlot.create({
            data: {
              seriesId: id,
              weekday: slotInput.weekday,
              localTime: slotInput.localTime,
              revision: scheduleVersion,
              order: slotInput.order
            }
          });
          if (slotInput.items.length > 0) {
            await tx.workoutSeriesItem.createMany({
              data: slotInput.items.map((item) => seriesItemData(id, slot.id, { ...item, id: undefined }))
            });
          }
        }

        const updated = await tx.workoutSeries.update({
          where: { id },
          data: {
            ...(input.label !== undefined ? { label: input.label } : {}),
            ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
            ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
            ...(input.focus !== undefined ? { focus: input.focus } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            scheduleVersion,
            generationThrough: localDateToDateOnly(addLocalDays(effectiveFrom, -1))
          },
          include: seriesInclude
        });
        const mapped = mapSeries(updated);
        const today = utcDateToLocalDate(new Date(), mapped.timezone);
        const generationBase = effectiveFrom > today ? effectiveFrom : today;
        const through = addLocalDays(generationBase, 90);
        if (mapped.status === "ACTIVE") {
          await this.materializeSeriesThrough(tx, trainerId, id, localDateToDateOnly(through));
        }
        await tx.workoutSeriesCommand.create({
          data: {
            trainerId,
            seriesId: id,
            operation: "update",
            idempotencyKey: input.mutationKey,
            requestHash,
            effectiveFrom: effectiveFromDate,
            resultThrough: localDateToDateOnly(through),
            resultVersion: mapped.version
          }
        });
        const finalSeries = await tx.workoutSeries.findUniqueOrThrow({ where: { id }, include: seriesInclude });
        const workoutSessions = await this.listSeriesSessionsRangeInTransaction(tx, id, effectiveFrom, through);
        return { series: mapSeries(finalSeries), workoutSessions, applied: true };
      });
    } catch (error) {
      if (error instanceof WorkoutSeriesVersionConflictError || isPrismaErrorCode(error, "P2002")) {
        const concurrentCommand = await this.findSeriesCommand(trainerId, "update", input.mutationKey);
        if (concurrentCommand) return this.replaySeriesCommand(trainerId, concurrentCommand, requestHash);
      }
      throw error;
    }
  }

  async ensureWorkoutSeriesOccurrences(trainerId: string, id: string, throughDate: Date, mutationKey: string) {
    const requestHash = hashCommand({ seriesId: id, throughDate });
    const previousCommand = await this.findSeriesCommand(trainerId, "ensure", mutationKey);
    if (previousCommand) return this.replayEnsureCommand(trainerId, id, previousCommand, requestHash);

    try {
      return await prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id::text AS id
          FROM workout_series
          WHERE id = ${id}::uuid
            AND trainer_id = ${trainerId}::uuid
            AND deleted_at IS NULL
          FOR UPDATE
        `;
        if (locked.length === 0) return null;
        const concurrentCommand = await tx.workoutSeriesCommand.findUnique({
          where: { trainerId_operation_idempotencyKey: { trainerId, operation: "ensure", idempotencyKey: mutationKey } }
        });
        if (concurrentCommand) {
          if (concurrentCommand.requestHash !== requestHash || concurrentCommand.seriesId !== id) throw new IdempotencyKeyReuseError();
          return this.listSeriesSessionsRangeInTransaction(
            tx,
            id,
            dateOnlyToLocalDate(concurrentCommand.effectiveFrom ?? concurrentCommand.resultThrough),
            dateOnlyToLocalDate(concurrentCommand.resultThrough)
          );
        }

        await this.materializeSeriesThrough(tx, trainerId, id, throughDate);
        const through = dateOnlyToLocalDate(throughDate);
        const rangeStart = addLocalDays(through, -366);
        const series = await tx.workoutSeries.findUniqueOrThrow({ where: { id }, select: { version: true } });
        await tx.workoutSeriesCommand.create({
          data: {
            trainerId,
            seriesId: id,
            operation: "ensure",
            idempotencyKey: mutationKey,
            requestHash,
            effectiveFrom: localDateToDateOnly(rangeStart),
            resultThrough: throughDate,
            resultVersion: series.version
          }
        });
        return this.listSeriesSessionsRangeInTransaction(tx, id, rangeStart, through);
      });
    } catch (error) {
      if (!isPrismaErrorCode(error, "P2002")) throw error;
      const concurrentCommand = await this.findSeriesCommand(trainerId, "ensure", mutationKey);
      if (!concurrentCommand) throw error;
      return this.replayEnsureCommand(trainerId, id, concurrentCommand, requestHash);
    }
  }

  async listWorkoutSessions(trainerId: string, query: ListSessionsQuery = {}) {
    const take = query.limit ?? 50;
    const where: Prisma.WorkoutSessionWhereInput = {
      trainerId,
      deletedAt: null,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : { status: { not: "SUPERSEDED" } }),
      ...(query.updatedSince ? { updatedAt: { gte: query.updatedSince } } : {}),
      ...(query.from || query.to
        ? {
            scheduledAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {})
            }
          }
        : {})
    };
    const data = await prisma.workoutSession.findMany({
      where,
      include: sessionInclude,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }]
    });
    const hasNext = data.length > take;
    const page = hasNext ? data.slice(0, take) : data;
    return { data: page.map(mapSession), nextCursor: hasNext ? page.at(-1)?.id ?? null : null };
  }

  async createWorkoutSession(trainerId: string, input: WorkoutSessionInput & { title: string }) {
    return mapSession(
      await prisma.workoutSession.create({
        data: {
          trainerId,
          clientId: input.clientId ?? null,
          workoutTemplateId: input.workoutTemplateId ?? null,
          title: input.title,
          status: input.status ?? "PLANNED",
          scheduledAt: input.scheduledAt ?? null,
          timezone: input.timezone ?? null,
          labelSnapshot: input.labelSnapshot ?? null,
          durationMinutes: input.durationMinutes ?? null,
          focus: input.focus ?? null,
          location: input.location ?? null,
          repeatDays: toNullablePrismaJson(input.repeatDays),
          scheduleTimes: toNullablePrismaJson(input.scheduleTimes),
          startedAt: input.startedAt ?? null,
          finishedAt: input.finishedAt ?? null,
          notes: input.notes ?? null,
          items: {
            create: (input.items ?? []).map(sessionItemData)
          }
        },
        include: sessionInclude
      })
    );
  }

  async getWorkoutSession(trainerId: string, id: string) {
    const session = await prisma.workoutSession.findFirst({ where: { id, trainerId, deletedAt: null }, include: sessionInclude });
    return session ? mapSession(session) : null;
  }

  async updateWorkoutSession(trainerId: string, id: string, input: WorkoutSessionInput) {
    const current = await this.getWorkoutSession(trainerId, id);
    if (!current) return null;
    if (input.expectedVersion !== undefined && current.version !== input.expectedVersion) {
      throw new WorkoutSessionVersionConflictError();
    }
    if (current.status === "IN_PROGRESS" && input.items) {
      const items = input.items;
      const currentItemsById = new Map(current.items.map((item) => [item.id, item]));
      const retainedItemIds = items.flatMap((item) => item.id && currentItemsById.has(item.id) ? [item.id] : []);

      return mapSession(
        await prisma.$transaction(async (tx) => {
          const claimed = await tx.workoutSession.updateMany({
            where: { id, trainerId, status: "IN_PROGRESS", version: current.version, deletedAt: null },
            data: { version: { increment: 1 } }
          });
          if (claimed.count !== 1) throw new WorkoutSessionVersionConflictError();

          await tx.workoutSessionItem.deleteMany({
            where: {
              workoutSessionId: id,
              ...(retainedItemIds.length > 0 ? { id: { notIn: retainedItemIds } } : {})
            }
          });

          for (const item of items) {
            if (item.id && currentItemsById.has(item.id)) {
              await tx.workoutSessionItem.update({
                where: { id: item.id },
                data: sessionItemData(item)
              });
              continue;
            }

            await tx.workoutSessionItem.create({
              data: {
                ...sessionItemData(item),
                workoutSessionId: id
              }
            });
          }

          return tx.workoutSession.update({
            where: { id },
            data: { updatedAt: new Date() },
            include: sessionInclude
          });
        })
      );
    }
    if (current.status !== "PLANNED") return null;
    if (input.status !== undefined && input.status !== "PLANNED") return null;
    const nextTimezone = input.timezone === undefined ? current.timezone : input.timezone;
    const nextScheduledAt = input.scheduledAt === undefined ? current.scheduledAt : input.scheduledAt;
    const nextScheduledLocalDate = nextScheduledAt && nextTimezone
      ? localDateToDateOnly(utcDateToLocalDate(nextScheduledAt, nextTimezone))
      : null;
    const nextScheduledLocalTime = nextScheduledAt && nextTimezone ? utcDateToLocalTime(nextScheduledAt, nextTimezone) : null;
    return mapSession(
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.workoutSession.updateMany({
          where: { id, trainerId, status: "PLANNED", version: current.version, deletedAt: null },
          data: { version: { increment: 1 } }
        });
        if (claimed.count !== 1) throw new WorkoutSessionVersionConflictError();

        if (input.items) {
          await tx.workoutSessionItem.deleteMany({ where: { workoutSessionId: id } });
        }
        return tx.workoutSession.update({
          where: { id },
          data: {
            ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
            ...(input.workoutTemplateId !== undefined ? { workoutTemplateId: input.workoutTemplateId } : {}),
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
            ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
            ...(input.labelSnapshot !== undefined ? { labelSnapshot: input.labelSnapshot } : {}),
            ...(input.scheduledAt !== undefined || input.timezone !== undefined
              ? { scheduledLocalDate: nextScheduledLocalDate, scheduledLocalTime: nextScheduledLocalTime }
              : {}),
            ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
            ...(input.focus !== undefined ? { focus: input.focus } : {}),
            ...(input.location !== undefined ? { location: input.location } : {}),
            ...(input.repeatDays !== undefined ? { repeatDays: toNullablePrismaJson(input.repeatDays) } : {}),
            ...(input.scheduleTimes !== undefined ? { scheduleTimes: toNullablePrismaJson(input.scheduleTimes) } : {}),
            ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
            ...(input.finishedAt !== undefined ? { finishedAt: input.finishedAt } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.items ? { items: { create: input.items.map(sessionItemData) } } : {})
          },
          include: sessionInclude
        });
      })
    );
  }

  async softDeleteWorkoutSession(trainerId: string, id: string) {
    const current = await this.getWorkoutSession(trainerId, id);
    if (!current) return null;
    return mapSession(await prisma.workoutSession.update({ where: { id }, data: { deletedAt: new Date() }, include: sessionInclude }));
  }

  async setWorkoutSessionStatus(trainerId: string, id: string, status: WorkoutSessionStatusRecord) {
    const current = await this.getWorkoutSession(trainerId, id);
    if (!current) return null;
    if (current.status === status) return current;
    const allowed =
      (current.status === "PLANNED" && (status === "IN_PROGRESS" || status === "CANCELLED")) ||
      (current.status === "IN_PROGRESS" && status === "COMPLETED");
    if (!allowed) throw new WorkoutSessionTransitionError(current.status, status);
    const now = new Date();
    const claimed = await prisma.workoutSession.updateMany({
      where: { id, trainerId, status: current.status, deletedAt: null },
      data: {
        status,
        version: { increment: 1 },
        ...(status === "IN_PROGRESS" ? { startedAt: current.startedAt ?? now } : {}),
        ...(status === "COMPLETED" ? { finishedAt: current.finishedAt ?? now } : {})
      }
    });
    if (claimed.count === 1) return this.getWorkoutSession(trainerId, id);

    const latest = await this.getWorkoutSession(trainerId, id);
    if (!latest) return null;
    if (latest.status === status) return latest;
    throw new WorkoutSessionTransitionError(latest.status, status);
  }

  async updateWorkoutResults(trainerId: string, id: string, items: Array<{ id: string; setResults: SetResultInput[] }>) {
    const current = await this.getWorkoutSession(trainerId, id);
    if (!current) return null;
    const validItemIds = new Set(current.items.map((item) => item.id));
    await prisma.$transaction(
      items
        .filter((item) => validItemIds.has(item.id))
        .flatMap((item) => [
          prisma.workoutSetResult.deleteMany({ where: { workoutSessionItemId: item.id } }),
          ...item.setResults.map((result) =>
            prisma.workoutSetResult.create({
              data: {
                id: result.id ?? undefined,
                workoutSessionItemId: item.id,
                setNumber: result.setNumber,
                reps: result.reps ?? null,
                weight: result.weight ?? null,
                durationSec: result.durationSec ?? null,
                distanceMeters: result.distanceMeters ?? null,
                completed: result.completed ?? false,
                notes: result.notes ?? null
              }
            })
          )
        ])
    );
    return this.getWorkoutSession(trainerId, id);
  }

  async bootstrap(trainerId: string, updatedSince?: Date): Promise<TrainerDataBootstrap> {
    const activeSeries = await prisma.workoutSeries.findMany({ where: { trainerId, status: "ACTIVE", deletedAt: null } });
    for (let offset = 0; offset < activeSeries.length; offset += 10) {
      await Promise.all(
        activeSeries.slice(offset, offset + 10).map((series) => {
          const localToday = utcDateToLocalDate(new Date(), series.timezone);
          return this.ensureWorkoutSeriesOccurrences(
            trainerId,
            series.id,
            localDateToDateOnly(addLocalDays(localToday, 90)),
            `bootstrap:${series.id}:v${series.version}:${localToday}`
          );
        })
      );
    }
    const updatedWhere = updatedSince ? { updatedAt: { gte: updatedSince } } : {};
    return {
      serverTime: new Date(),
      clients: (await prisma.client.findMany({ where: { trainerId, deletedAt: null, ...updatedWhere }, orderBy: [{ updatedAt: "desc" }] })).map(mapClient),
      exercises: (await prisma.exercise.findMany({ where: { deletedAt: null, OR: [{ isSystem: true }, { trainerId }], ...updatedWhere }, orderBy: [{ updatedAt: "desc" }] })).map(mapExercise),
      workoutTemplates: (await prisma.workoutTemplate.findMany({ where: { trainerId, deletedAt: null, ...updatedWhere }, include: templateInclude, orderBy: [{ updatedAt: "desc" }] })).map(mapTemplate),
      workoutSeries: (await prisma.workoutSeries.findMany({ where: { trainerId, deletedAt: null, ...updatedWhere }, include: seriesInclude, orderBy: [{ updatedAt: "desc" }] })).map(mapSeries),
      workoutSessions: (await prisma.workoutSession.findMany({ where: { trainerId, deletedAt: null, status: { not: "SUPERSEDED" }, ...updatedWhere }, include: sessionInclude, orderBy: [{ updatedAt: "desc" }] })).map(mapSession)
    };
  }

  async logActivity(userId: string | null, type: string, entityType?: string, entityId?: string, metadata?: unknown, deduplicationKey?: string) {
    const data = {
      userId,
      type,
      entityType,
      entityId,
      deduplicationKey,
      metadata: metadata === undefined ? undefined : metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue)
    };
    if (deduplicationKey) {
      await prisma.activityEvent.upsert({ where: { deduplicationKey }, update: {}, create: data });
      return;
    }
    await prisma.activityEvent.create({ data });
  }

  private async findSeriesCommand(trainerId: string, operation: string, idempotencyKey: string) {
    return prisma.workoutSeriesCommand.findUnique({
      where: { trainerId_operation_idempotencyKey: { trainerId, operation, idempotencyKey } }
    });
  }

  private async replaySeriesCommand(
    trainerId: string,
    command: { seriesId: string; requestHash: string; effectiveFrom: Date | null; resultThrough: Date },
    requestHash: string
  ): Promise<WorkoutSeriesMutationResult> {
    if (command.requestHash !== requestHash) throw new IdempotencyKeyReuseError();
    const series = await this.getWorkoutSeries(trainerId, command.seriesId);
    if (!series) throw new WorkoutSeriesVersionConflictError();
    const start = command.effectiveFrom ? dateOnlyToLocalDate(command.effectiveFrom) : nextGenerationStart(series, new Date());
    return {
      series,
      workoutSessions: await this.listSeriesSessionsRange(series.id, start, dateOnlyToLocalDate(command.resultThrough)),
      applied: false
    };
  }

  private async replayEnsureCommand(
    trainerId: string,
    seriesId: string,
    command: { seriesId: string; requestHash: string; effectiveFrom: Date | null; resultThrough: Date },
    requestHash: string
  ) {
    if (command.requestHash !== requestHash || command.seriesId !== seriesId) throw new IdempotencyKeyReuseError();
    const series = await this.getWorkoutSeries(trainerId, seriesId);
    if (!series) return null;
    const start = dateOnlyToLocalDate(command.effectiveFrom ?? command.resultThrough);
    return this.listSeriesSessionsRange(seriesId, start, dateOnlyToLocalDate(command.resultThrough));
  }

  private async materializeSeriesThrough(
    tx: Prisma.TransactionClient,
    trainerId: string,
    id: string,
    throughDate: Date
  ): Promise<WorkoutSessionRecord[]> {
    const series = await tx.workoutSeries.findFirst({
      where: { id, trainerId, deletedAt: null },
      include: { ...seriesInclude, client: { select: { status: true, deletedAt: true } } }
    });
    if (!series || series.status !== "ACTIVE" || series.client.status !== "ACTIVE" || series.client.deletedAt) return [];

    const mapped = mapSeries(series);
    const through = dateOnlyToLocalDate(throughDate);
    const startDate = dateOnlyToLocalDate(mapped.startDate);
    const today = utcDateToLocalDate(new Date(), mapped.timezone);
    const firstUngeneratedDate = mapped.generationThrough
      ? addLocalDays(dateOnlyToLocalDate(mapped.generationThrough), 1)
      : startDate;
    const effectiveStart = [firstUngeneratedDate, startDate, today].sort().at(-1)!;
    const occurrences = generateWorkoutSeriesOccurrences({
      seriesId: id,
      scheduleVersion: mapped.scheduleVersion,
      timezone: mapped.timezone,
      startDate: effectiveStart,
      throughDate: through,
      slots: mapped.slots.map((slot) => ({ id: slot.id, weekday: slot.weekday, localTime: slot.localTime }))
    });
    const slotsById = new Map(mapped.slots.map((slot) => [slot.id, slot]));
    const blockedRows = await tx.workoutSession.findMany({
      where: {
        seriesId: id,
        deletedAt: null,
        status: { in: ["CANCELLED", "IN_PROGRESS", "COMPLETED"] },
        scheduledLocalDate: { gte: localDateToDateOnly(effectiveStart), lte: throughDate }
      },
      select: { scheduledLocalDate: true }
    });
    const blockedDates = new Set(
      blockedRows.flatMap((session) => session.scheduledLocalDate ? [dateOnlyToLocalDate(session.scheduledLocalDate)] : [])
    );
    const occurrenceKeys = occurrences.map((occurrence) => occurrence.occurrenceKey);
    const existingKeys = occurrenceKeys.length === 0
      ? new Set<string>()
      : new Set(
          (
            await tx.workoutSession.findMany({
              where: { seriesId: id, occurrenceKey: { in: occurrenceKeys } },
              select: { occurrenceKey: true }
            })
          ).flatMap((session) => session.occurrenceKey ? [session.occurrenceKey] : [])
        );

    const created: WorkoutSessionRecord[] = [];
    for (const occurrence of occurrences) {
      if (blockedDates.has(occurrence.scheduledLocalDate) || existingKeys.has(occurrence.occurrenceKey)) continue;
      const slot = slotsById.get(occurrence.seriesSlotId);
      if (!slot) continue;
      const session = await tx.workoutSession.create({
        data: {
          trainerId,
          clientId: mapped.clientId,
          seriesId: id,
          seriesSlotId: slot.id,
          title: mapped.label || "Тренировка",
          status: "PLANNED",
          occurrenceKey: occurrence.occurrenceKey,
          scheduledAt: occurrence.scheduledAt,
          scheduledLocalDate: localDateToDateOnly(occurrence.scheduledLocalDate),
          scheduledLocalTime: occurrence.scheduledLocalTime,
          timezone: mapped.timezone,
          labelSnapshot: mapped.label,
          durationMinutes: mapped.durationMinutes,
          focus: mapped.focus,
          location: mapped.location,
          notes: mapped.notes,
          items: {
            create: slot.items.map((item) => sessionItemData({ ...item, id: undefined, day: slot.weekday }))
          }
        },
        include: sessionInclude
      });
      created.push(mapSession(session));
    }
    if (!mapped.generationThrough || dateOnlyToLocalDate(mapped.generationThrough) < through) {
      await tx.workoutSeries.update({ where: { id }, data: { generationThrough: throughDate } });
    }
    return created;
  }

  private async listSeriesSessionsRange(seriesId: string, fromDate: string, throughDate: string) {
    return (
      await prisma.workoutSession.findMany({
        where: {
          seriesId,
          deletedAt: null,
          status: { not: "SUPERSEDED" },
          scheduledLocalDate: { gte: localDateToDateOnly(fromDate), lte: localDateToDateOnly(throughDate) }
        },
        include: sessionInclude,
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }]
      })
    ).map(mapSession);
  }

  private async listSeriesSessionsRangeInTransaction(
    tx: Prisma.TransactionClient,
    seriesId: string,
    fromDate: string,
    throughDate: string
  ) {
    return (
      await tx.workoutSession.findMany({
        where: {
          seriesId,
          deletedAt: null,
          status: { not: "SUPERSEDED" },
          scheduledLocalDate: { gte: localDateToDateOnly(fromDate), lte: localDateToDateOnly(throughDate) }
        },
        include: sessionInclude,
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }]
      })
    ).map(mapSession);
  }
}

function hashCommand(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function nextGenerationStart(series: WorkoutSeriesRecord, now: Date) {
  const startDate = dateOnlyToLocalDate(series.startDate);
  const today = utcDateToLocalDate(now, series.timezone);
  return startDate > today ? startDate : today;
}

function itemData(item: WorkoutItemInput) {
  return {
    exerciseId: item.exerciseId ?? null,
    order: item.order,
    titleSnapshot: item.titleSnapshot ?? null,
    resultType: item.resultType ?? null,
    day: item.day ?? null,
    supersetWithNext: item.supersetWithNext ?? null,
    plannedSetTargets: toNullablePrismaJson(normalizePlannedSetTargets(item.plannedSetTargets)),
    plannedSets: item.plannedSets ?? null,
    plannedReps: item.plannedReps ?? null,
    plannedWeight: item.plannedWeight ?? null,
    plannedDurationSec: item.plannedDurationSec ?? null,
    restSeconds: item.restSeconds ?? null,
    notes: item.notes ?? null
  };
}

function sessionItemData(item: WorkoutItemInput) {
  return {
    id: item.id ?? undefined,
    exerciseId: item.exerciseId ?? null,
    order: item.order,
    titleSnapshot: item.titleSnapshot ?? "Упражнение",
    resultType: item.resultType ?? null,
    day: item.day ?? null,
    supersetWithNext: item.supersetWithNext ?? null,
    plannedSetTargets: toNullablePrismaJson(normalizePlannedSetTargets(item.plannedSetTargets)),
    plannedSets: item.plannedSets ?? null,
    plannedReps: item.plannedReps ?? null,
    plannedWeight: item.plannedWeight ?? null,
    plannedDurationSec: item.plannedDurationSec ?? null,
    restSeconds: item.restSeconds ?? null,
    notes: item.notes ?? null
  };
}

function seriesItemData(seriesId: string, seriesSlotId: string, item: WorkoutItemInput) {
  return {
    seriesId,
    seriesSlotId,
    exerciseId: item.exerciseId ?? null,
    order: item.order,
    titleSnapshot: item.titleSnapshot ?? "Упражнение",
    resultType: item.resultType ?? null,
    supersetWithNext: item.supersetWithNext ?? null,
    plannedSetTargets: toNullablePrismaJson(normalizePlannedSetTargets(item.plannedSetTargets)),
    plannedSets: item.plannedSets ?? null,
    plannedReps: item.plannedReps ?? null,
    plannedWeight: item.plannedWeight ?? null,
    plannedDurationSec: item.plannedDurationSec ?? null,
    restSeconds: item.restSeconds ?? null,
    notes: item.notes ?? null
  };
}

function mapClient(client: Omit<ClientRecord, "profile"> & { profile: Prisma.JsonValue }): ClientRecord {
  return { ...client, profile: clientProfileFromJson(client.profile) };
}

function toPrismaProfile(profile: ClientRecord["profile"]): Prisma.InputJsonObject {
  return profile as unknown as Prisma.InputJsonObject;
}

function toNullablePrismaJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === undefined || value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
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

type PrismaExerciseRecord = Prisma.ExerciseGetPayload<Record<string, never>>;
type PrismaTemplateRecord = Prisma.WorkoutTemplateGetPayload<{ include: typeof templateInclude }>;
type PrismaSessionRecord = Prisma.WorkoutSessionGetPayload<{ include: typeof sessionInclude }>;
type PrismaSeriesRecord = Prisma.WorkoutSeriesGetPayload<{ include: typeof seriesInclude }>;

function mapExercise(exercise: PrismaExerciseRecord): ExerciseRecord {
  return {
    ...exercise,
    primaryMuscles: stringArrayFromJson(exercise.primaryMuscles),
    secondaryMuscles: stringArrayFromJson(exercise.secondaryMuscles),
    resultType: resultTypeFromString(exercise.resultType)
  };
}

function mapTemplate(template: PrismaTemplateRecord): WorkoutTemplateRecord {
  return {
    ...template,
    items: template.items.map((item) => ({
      ...item,
      resultType: resultTypeFromString(item.resultType),
      day: repeatDayFromString(item.day),
      plannedSetTargets: plannedSetTargetsFromJson(item.plannedSetTargets)
    }))
  };
}

function mapSession(session: PrismaSessionRecord): WorkoutSessionRecord {
  return {
    ...session,
    repeatDays: repeatDaysFromJson(session.repeatDays),
    scheduleTimes: scheduleTimesFromJson(session.scheduleTimes),
    items: session.items.map((item) => ({
      ...item,
      resultType: resultTypeFromString(item.resultType),
      day: repeatDayFromString(item.day),
      plannedSetTargets: plannedSetTargetsFromJson(item.plannedSetTargets)
    }))
  };
}

function mapSeries(series: PrismaSeriesRecord): WorkoutSeriesRecord {
  return {
    ...series,
    slots: series.slots
      .filter((slot) => slot.revision === series.scheduleVersion)
      .map((slot) => ({
        ...slot,
        weekday: repeatDayFromString(slot.weekday) ?? "monday",
        items: slot.items.map((item) => ({
          ...item,
          resultType: resultTypeFromString(item.resultType),
          plannedSetTargets: plannedSetTargetsFromJson(item.plannedSetTargets)
        }))
      }))
  };
}

function resultTypeFromString(value: string | null): WorkoutResultTypeRecord | null {
  return value && workoutResultTypeSet.has(value) ? (value as WorkoutResultTypeRecord) : null;
}

function repeatDayFromString(value: string | null): RepeatDayRecord | null {
  return value && repeatDaySet.has(value) ? (value as RepeatDayRecord) : null;
}

function stringArrayFromJson(value: Prisma.JsonValue | null): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? [...value] : null;
}

function repeatDaysFromJson(value: Prisma.JsonValue | null): RepeatDayRecord[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && repeatDaySet.has(item))) return null;
  return [...value] as RepeatDayRecord[];
}

function scheduleTimesFromJson(value: Prisma.JsonValue | null): Partial<Record<RepeatDayRecord, string>> | null {
  if (!isJsonObject(value)) return null;
  const schedule: Partial<Record<RepeatDayRecord, string>> = {};
  for (const [day, time] of Object.entries(value)) {
    if (!repeatDaySet.has(day) || typeof time !== "string") return null;
    schedule[day as RepeatDayRecord] = time;
  }
  return schedule;
}

function plannedSetTargetsFromJson(value: Prisma.JsonValue | null): PlannedSetTargetRecord[] | null {
  if (!Array.isArray(value)) return null;
  const targets: PlannedSetTargetRecord[] = [];
  for (const target of value) {
    if (!isJsonObject(target) || typeof target.id !== "string" || typeof target.order !== "number" || !Number.isInteger(target.order)) return null;
    const values = target.values === undefined || target.values === null ? null : metricValuesFromJson(target.values);
    if (target.values !== undefined && target.values !== null && values === null) return null;
    targets.push({
      id: target.id,
      order: target.order,
      values,
      targetWeightKg: nullableJsonNumber(target.targetWeightKg),
      targetReps: nullableJsonNumber(target.targetReps),
      targetDurationSeconds: nullableJsonNumber(target.targetDurationSeconds),
      targetDistanceMeters: nullableJsonNumber(target.targetDistanceMeters)
    });
  }
  return targets;
}

function metricValuesFromJson(value: Prisma.JsonValue): WorkoutMetricValuesRecord | null {
  if (!isJsonObject(value)) return null;
  const metrics: WorkoutMetricValuesRecord = {};
  for (const [key, metric] of Object.entries(value)) {
    if (!workoutMetricKeySet.has(key) || typeof metric !== "number" || !Number.isFinite(metric)) return null;
    metrics[key as keyof WorkoutMetricValuesRecord] = metric;
  }
  return metrics;
}

function nullableJsonNumber(value: Prisma.JsonValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value);
}

function isPrismaErrorCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
