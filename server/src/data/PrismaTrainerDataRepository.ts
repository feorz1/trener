import { Prisma, PrismaClient } from "@prisma/client";
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
  WorkoutSessionRecord,
  WorkoutSessionStatusRecord,
  WorkoutTemplateInput,
  WorkoutTemplateRecord
} from "./types";
import { clientProfileFromJson, mergeClientProfile } from "./clientProfile";

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

export class PrismaTrainerDataRepository implements TrainerDataRepository {
  async ready() {
    await prisma.$queryRaw`SELECT 1`;
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
          equipment: input.equipment ?? null,
          description: input.description ?? null,
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
          ...(input.equipment !== undefined ? { equipment: input.equipment } : {}),
          ...(input.description !== undefined ? { description: input.description } : {})
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

  async listWorkoutSessions(trainerId: string, query: ListSessionsQuery = {}) {
    const take = query.limit ?? 50;
    const where: Prisma.WorkoutSessionWhereInput = {
      trainerId,
      deletedAt: null,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
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
    if (current.status === "IN_PROGRESS" && input.items) {
      const items = input.items;
      const currentItemsById = new Map(current.items.map((item) => [item.id, item]));
      const retainedItemIds = items.flatMap((item) => item.id && currentItemsById.has(item.id) ? [item.id] : []);

      return mapSession(
        await prisma.$transaction(async (tx) => {
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
    return mapSession(
      await prisma.$transaction(async (tx) => {
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
    const now = new Date();
    return mapSession(
      await prisma.workoutSession.update({
        where: { id },
        data: {
          status,
          ...(status === "IN_PROGRESS" ? { startedAt: current.startedAt ?? now } : {}),
          ...(status === "COMPLETED" ? { finishedAt: current.finishedAt ?? now } : {})
        },
        include: sessionInclude
      })
    );
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
    const updatedWhere = updatedSince ? { updatedAt: { gte: updatedSince } } : {};
    return {
      serverTime: new Date(),
      clients: (await prisma.client.findMany({ where: { trainerId, deletedAt: null, ...updatedWhere }, orderBy: [{ updatedAt: "desc" }] })).map(mapClient),
      exercises: (await prisma.exercise.findMany({ where: { deletedAt: null, OR: [{ isSystem: true }, { trainerId }], ...updatedWhere }, orderBy: [{ updatedAt: "desc" }] })).map(mapExercise),
      workoutTemplates: (await prisma.workoutTemplate.findMany({ where: { trainerId, deletedAt: null, ...updatedWhere }, include: templateInclude, orderBy: [{ updatedAt: "desc" }] })).map(mapTemplate),
      workoutSessions: (await prisma.workoutSession.findMany({ where: { trainerId, deletedAt: null, ...updatedWhere }, include: sessionInclude, orderBy: [{ updatedAt: "desc" }] })).map(mapSession)
    };
  }

  async logActivity(userId: string | null, type: string, entityType?: string, entityId?: string, metadata?: unknown) {
    await prisma.activityEvent.create({
      data: {
        userId,
        type,
        entityType,
        entityId,
        metadata: metadata === undefined ? undefined : metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue)
      }
    });
  }
}

function itemData(item: WorkoutItemInput) {
  return {
    exerciseId: item.exerciseId ?? null,
    order: item.order,
    titleSnapshot: item.titleSnapshot ?? null,
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

function mapExercise(exercise: ExerciseRecord): ExerciseRecord {
  return exercise;
}

function mapTemplate(template: WorkoutTemplateRecord): WorkoutTemplateRecord {
  return template;
}

function mapSession(session: WorkoutSessionRecord): WorkoutSessionRecord {
  return session;
}
