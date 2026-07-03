import type { Workout } from "../types";

function getExerciseScope(exercise: Workout["exercises"][number]) {
  return exercise.day ?? "";
}

export function sortWorkoutExercisesByOrder(exercises: Workout["exercises"]) {
  return [...exercises].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function getAdjacentConnectionIds(ids: string[]) {
  return ids.slice(0, -1).map((id, index) => `${id}:${ids[index + 1]}`);
}

export function getSupersetConnectionIds(exercises: Workout["exercises"]) {
  const orderedExercises = sortWorkoutExercisesByOrder(exercises);

  return orderedExercises.slice(0, -1).flatMap((exercise, index) => {
    const nextExercise = orderedExercises[index + 1];
    return exercise.supersetWithNext && nextExercise ? [`${exercise.id}:${nextExercise.id}`] : [];
  });
}

function getSupersetGroupByExercise(ids: string[], connectionIds: string[]) {
  const connectionSet = new Set(connectionIds);
  const groupByExercise: Record<string, number> = {};
  let activeGroup: string[] = [];
  let groupIndex = 0;

  ids.forEach((id, index) => {
    const nextId = ids[index + 1];
    const hasNextConnection = Boolean(nextId && connectionSet.has(`${id}:${nextId}`));

    if (activeGroup.length === 0) {
      activeGroup = [id];
    }

    if (hasNextConnection && nextId) {
      activeGroup.push(nextId);
      return;
    }

    if (activeGroup.length > 1) {
      activeGroup.forEach((exerciseId) => {
        groupByExercise[exerciseId] = groupIndex;
      });
      groupIndex += 1;
    }

    activeGroup = [];
  });

  return groupByExercise;
}

export function preserveSupersetConnectionsAfterReorder(currentIds: string[], nextIds: string[], connectionIds: string[]) {
  const groupByExercise = getSupersetGroupByExercise(currentIds, connectionIds);

  return nextIds.slice(0, -1).flatMap((id, index) => {
    const nextId = nextIds[index + 1];
    if (!nextId) return [];

    const group = groupByExercise[id];
    return group !== undefined && group === groupByExercise[nextId] ? [`${id}:${nextId}`] : [];
  });
}

export function syncSupersetConnectionsForScope(exercises: Workout["exercises"], scope: string | undefined, connectionIds: string[]) {
  const scopedExercises = sortWorkoutExercisesByOrder(exercises.filter((exercise) => getExerciseScope(exercise) === (scope ?? "")));
  const nextIdById = Object.fromEntries(scopedExercises.slice(0, -1).map((exercise, index) => [exercise.id, scopedExercises[index + 1].id]));
  const connectionSet = new Set(connectionIds);

  return exercises.map((exercise) => {
    if (getExerciseScope(exercise) !== (scope ?? "")) return exercise;

    const nextId = nextIdById[exercise.id];
    return {
      ...exercise,
      supersetWithNext: Boolean(nextId && connectionSet.has(`${exercise.id}:${nextId}`))
    };
  });
}
