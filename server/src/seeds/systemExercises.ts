import { PrismaClient } from "@prisma/client";
import { mockExercises } from "../../../src/data/mockExercises";
import type { Exercise } from "../../../src/types";

export type SystemExerciseSeedRow = {
  systemKey: string;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
  description: string | null;
};

export function buildSystemExerciseSeedRows(exercises: Exercise[] = mockExercises): SystemExerciseSeedRow[] {
  const rows = exercises
    .filter((exercise) => exercise.source !== "custom" && !exercise.archivedAt)
    .map((exercise) => ({
      systemKey: `local:${exercise.id}`,
      name: exercise.name.trim().replace(/\s+/g, " "),
      muscleGroup: exercise.primaryMuscles[0] ?? null,
      equipment: exercise.equipment?.trim() || null,
      description: buildDescription(exercise)
    }))
    .filter((exercise) => exercise.name.length > 0);

  const seenKeys = new Set<string>();
  const seenNames = new Set<string>();
  return rows.filter((row) => {
    if (seenKeys.has(row.systemKey)) return false;
    const normalizedName = row.name.toLocaleLowerCase("ru-RU");
    if (seenNames.has(normalizedName)) return false;
    seenKeys.add(row.systemKey);
    seenNames.add(normalizedName);
    return true;
  });
}

export async function seedSystemExercises(prisma = new PrismaClient()) {
  const rows = buildSystemExerciseSeedRows();
  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const existingByKey = await tx.exercise.findUnique({ where: { systemKey: row.systemKey } });
      if (existingByKey) {
        await tx.exercise.update({
          where: { id: existingByKey.id },
          data: {
            trainerId: null,
            isSystem: true,
            name: row.name,
            muscleGroup: row.muscleGroup,
            equipment: row.equipment,
            description: row.description,
            deletedAt: null
          }
        });
        updated += 1;
        continue;
      }

      const existingByName = await tx.exercise.findFirst({
        where: {
          isSystem: true,
          trainerId: null,
          name: row.name
        }
      });

      if (existingByName) {
        await tx.exercise.update({
          where: { id: existingByName.id },
          data: {
            systemKey: row.systemKey,
            muscleGroup: row.muscleGroup,
            equipment: row.equipment,
            description: row.description,
            deletedAt: null
          }
        });
        updated += 1;
        continue;
      }

      await tx.exercise.create({
        data: {
          systemKey: row.systemKey,
          trainerId: null,
          isSystem: true,
          name: row.name,
          muscleGroup: row.muscleGroup,
          equipment: row.equipment,
          description: row.description
        }
      });
      created += 1;
    }
  });

  return { total: rows.length, created, updated };
}

function buildDescription(exercise: Exercise) {
  const parts = [exercise.notes, exercise.coachNotes].map((value) => value?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedSystemExercises(prisma);
    console.log(`System exercises seed complete: ${result.total} total, ${result.created} created, ${result.updated} updated`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
