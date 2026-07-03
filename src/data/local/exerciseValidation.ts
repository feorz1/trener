import { DataError } from "../contracts";
import type { Exercise, ExerciseId, OwnerId } from "../types";
import type { LocalDataState } from "./localState";

function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function getNormalizedExerciseName(name: string) {
  return normalizeExerciseName(name);
}

export function assertUniqueActiveExerciseName(
  state: LocalDataState,
  input: {
    ownerId: OwnerId;
    name: string;
    excludeExerciseId?: ExerciseId;
  }
) {
  const normalizedName = normalizeExerciseName(input.name);
  if (!normalizedName) {
    throw new DataError("validation", "Название упражнения обязательно", { retryable: false });
  }

  const duplicate = state.exerciseIds
    .map((id) => state.exercisesById[id])
    .find((exercise) => {
      if (!exercise || exercise.ownerId !== input.ownerId || exercise.id === input.excludeExerciseId || exercise.archivedAt) return false;
      return normalizeExerciseName(exercise.name) === normalizedName;
    });

  if (duplicate) {
    throw new DataError("validation", "Упражнение с таким названием уже есть", { retryable: false });
  }
}

export function normalizeExercisePatch<T extends Partial<Pick<Exercise, "name" | "equipment" | "resultType" | "searchAliases" | "coachNotes" | "notes">>>(patch: T): T {
  return {
    ...patch,
    name: patch.name === undefined ? patch.name : patch.name.trim().replace(/\s+/g, " "),
    equipment: patch.equipment === undefined ? patch.equipment : patch.equipment.trim(),
    searchAliases: patch.searchAliases === undefined ? patch.searchAliases : patch.searchAliases.map((alias) => alias.trim().replace(/\s+/g, " ")).filter(Boolean),
    coachNotes: patch.coachNotes === undefined ? patch.coachNotes : patch.coachNotes.trim(),
    notes: patch.notes === undefined ? patch.notes : patch.notes.trim()
  };
}
