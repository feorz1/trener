import type { SessionResultSet } from "./sessionResult";
import type { Workout } from "@/types";

export type SessionExercise = Omit<Workout["exercises"][number], "sets"> & {
  sets: SessionResultSet[];
};

export type SessionExerciseMergeOptions = {
  preserveLocalSetKeys?: ReadonlySet<string>;
  deletedSetIndexesByExercise?: ReadonlyMap<string, ReadonlySet<number>>;
};

export function getSessionSetKey(exerciseId: string, setId: string) {
  return `${exerciseId}:${setId}`;
}

export function normalizeSessionSetIndexes<T extends { index: number }>(sets: T[]) {
  const uniqueSetsByIndex = new Map<number, T>();
  for (const set of sets) {
    uniqueSetsByIndex.set(set.index, set);
  }
  return Array.from(uniqueSetsByIndex.values())
    .sort((left, right) => left.index - right.index)
    .map((set, index) => ({ ...set, index: index + 1 }));
}

function hasIncomingSetMatch(incomingSets: SessionResultSet[], localSet: SessionResultSet) {
  return incomingSets.some((incomingSet) => incomingSet.id === localSet.id || incomingSet.index === localSet.index);
}

function mergeIncomingSet(
  exerciseId: string,
  currentSets: SessionResultSet[],
  incomingSet: SessionResultSet,
  preserveLocalSetKeys: ReadonlySet<string>
) {
  const localSet = currentSets.find((set) => set.id === incomingSet.id) ?? currentSets.find((set) => set.index === incomingSet.index);
  if (localSet && preserveLocalSetKeys.has(getSessionSetKey(exerciseId, localSet.id))) {
    return { ...incomingSet, ...localSet, id: localSet.id };
  }
  return localSet ? { ...incomingSet, id: localSet.id } : incomingSet;
}

export function mergeSessionExercises(
  current: SessionExercise[],
  incoming: SessionExercise[],
  options: SessionExerciseMergeOptions = {}
) {
  if (current.length === 0) return incoming;

  const preserveLocalSetKeys = options.preserveLocalSetKeys ?? new Set<string>();

  const incomingExerciseIds = new Set(incoming.map((exercise) => exercise.id));
  const mergedIncoming = incoming.map((incomingExercise) => {
    const currentExercise = current.find((exercise) => exercise.id === incomingExercise.id);
    if (!currentExercise) return incomingExercise;

    const deletedSetIndexes = options.deletedSetIndexesByExercise?.get(incomingExercise.id) ?? new Set<number>();
    const visibleIncomingSets = incomingExercise.sets.filter((set) => !deletedSetIndexes.has(set.index));
    const incomingSets = visibleIncomingSets.map((set) =>
      mergeIncomingSet(incomingExercise.id, currentExercise.sets, set, preserveLocalSetKeys)
    );
    const localSets = currentExercise.sets.filter((set) => !hasIncomingSetMatch(visibleIncomingSets, set));

    return {
      ...incomingExercise,
      sets: normalizeSessionSetIndexes([...incomingSets, ...localSets])
    };
  });

  return [
    ...mergedIncoming,
    ...current.filter((exercise) => !incomingExerciseIds.has(exercise.id))
  ];
}
