import type { OwnerId } from "../types";
import type { LocalDataState } from "../local/localState";
import type { Client, Exercise, Workout, WorkoutResult, WorkoutResultType, WorkoutSession } from "../types";
import type { MetricValues } from "@/types";
import type { AuthorizedFetch, DataApiBootstrapPayload, DataApiClient, DataApiClientIntake, DataApiExercise, DataApiWorkoutSession, DataApiWorkoutSessionItem, DataApiWorkoutSetResult } from "../api/dataApi.types";
import { exerciseCatalog } from "../exerciseCatalog";
import { getPrimaryWeightMetricKey } from "@/features/workouts/tracking";
import { withNetworkTimeout } from "@/utils/networkTimeout";

export async function fetchBootstrapState({
  baseUrl,
  authorizedFetch,
  ownerId,
  timeoutMs
}: {
  baseUrl: string;
  authorizedFetch: AuthorizedFetch;
  ownerId: OwnerId;
  timeoutMs?: number;
}): Promise<LocalDataState> {
  const payload = await withNetworkTimeout(async (signal) => {
    const response = await authorizedFetch(`${baseUrl.replace(/\/$/, "")}/sync/bootstrap`, {
      signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Bootstrap failed with ${response.status}`);
    }
    return (await response.json()) as DataApiBootstrapPayload;
  }, { timeoutMs });
  return bootstrapPayloadToState(payload, ownerId);
}

export function bootstrapPayloadToState(payload: DataApiBootstrapPayload, ownerId: OwnerId): LocalDataState {
  const clients = (payload.clients ?? []).filter((client) => !isDeleted(client)).map((client) => mapClient(client, ownerId));
  const exercises = (payload.exercises ?? []).filter((exercise) => !exercise.deletedAt).map((exercise) => mapExercise(exercise, ownerId));
  const sessions = (payload.workoutSessions ?? []).filter((session) => !isDeleted(session));
  const workouts = sessions.map((session) => mapWorkout(session, ownerId));
  const workoutSessions = sessions.map((session) => mapSession(session, ownerId)).filter((session): session is WorkoutSession => Boolean(session));
  const results = sessions.filter((session) => session.status !== "planned").flatMap((session) => mapResults(session, ownerId));

  return {
    clientsById: Object.fromEntries(clients.map((client) => [client.id, client])),
    clientIds: clients.map((client) => client.id),
    exercisesById: Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise])),
    exerciseIds: exercises.map((exercise) => exercise.id),
    workoutsById: Object.fromEntries(workouts.map((workout) => [workout.id, workout])),
    workoutIds: workouts.map((workout) => workout.id),
    sessionsById: Object.fromEntries(workoutSessions.map((session) => [session.id, session])),
    sessionIds: workoutSessions.map((session) => session.id),
    resultsById: Object.fromEntries(results.map((result) => [result.id, result])),
    resultIds: results.map((result) => result.id),
    quickValuesById: {},
    quickValueIds: []
  };
}

export function mapClient(client: DataApiClient, ownerId: OwnerId): Client {
  const profile = client.profile ?? undefined;
  const metrics = profile?.metrics ?? undefined;

  return {
    id: client.id,
    ownerId,
    name: client.name,
    phone: client.phone ?? undefined,
    email: client.email ?? undefined,
    birthDate: client.birthDate ?? undefined,
    telegram: profile?.telegram ?? undefined,
    gender: profile?.gender ?? undefined,
    goal: profile?.goal ?? "Новая цель",
    status: client.status === "archived" ? "paused" : "active",
    avatarInitials: getInitials(client.name),
    nextWorkoutAt: client.updatedAt ?? new Date().toISOString(),
    notes: client.notes ?? "",
    restrictions: profile?.restrictions ? [...profile.restrictions] : undefined,
    intake: mapClientIntake(profile?.intake),
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    metrics: {
      weightKg: metrics?.weightKg ?? 0,
      heightCm: metrics?.heightCm ?? 0,
      attendanceRate: metrics?.attendanceRate ?? 100
    }
  };
}

function mapClientIntake(intake: DataApiClientIntake | null | undefined): Client["intake"] {
  if (!intake) return undefined;

  return {
    ageYears: intake.ageYears ?? undefined,
    targetWeightKg: intake.targetWeightKg ?? undefined,
    healthConstraints: intake.healthConstraints ? [...intake.healthConstraints] : undefined,
    exerciseRestrictions: intake.exerciseRestrictions ? [...intake.exerciseRestrictions] : undefined,
    activityLevel: intake.activityLevel ?? undefined,
    sleep: intake.sleep ?? undefined,
    workoutsPerWeek: intake.workoutsPerWeek ?? undefined,
    trainingExperience: intake.trainingExperience ?? undefined,
    sports: intake.sports ? [...intake.sports] : undefined
  };
}

export function mapExercise(exercise: DataApiExercise, ownerId: OwnerId): Exercise {
  return {
    id: exercise.id,
    ownerId,
    name: exercise.name,
    category: "strength",
    source: exercise.isSystem ? "built_in" : "custom",
    primaryMuscles: exercise.primaryMuscles != null
      ? [...exercise.primaryMuscles]
      : exercise.muscleGroup
        ? [exercise.muscleGroup]
        : ["all"],
    secondaryMuscles: exercise.secondaryMuscles != null ? [...exercise.secondaryMuscles] : undefined,
    equipment: exercise.equipment ?? "Не указано",
    resultType: getExerciseResultType(exercise.id, exercise.name, exercise.resultType ?? undefined),
    notes: exercise.description ?? undefined,
    archivedAt: exercise.deletedAt ?? undefined,
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt
  };
}

export function mapWorkout(session: DataApiWorkoutSession, ownerId: OwnerId): Workout {
  const startsAt = session.scheduledAt ?? session.startedAt ?? session.createdAt ?? new Date().toISOString();
  return {
    id: session.id,
    ownerId,
    clientId: session.clientId ?? undefined,
    title: session.title,
    startsAt,
    timezone: session.timezone ?? undefined,
    durationMinutes: session.durationMinutes ?? 60,
    focus: session.focus ?? session.notes ?? "",
    location: session.location ?? "Зал",
    status: mapWorkoutStatus(session.status),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    exercises: (session.items ?? []).map((item) => {
      const resultType = getExerciseResultType(item.exerciseId ?? item.id, item.titleSnapshot, item.resultType ?? undefined);
      return {
        id: item.id,
        exerciseId: item.exerciseId ?? item.id,
        exerciseName: item.titleSnapshot,
        resultType,
        order: item.order,
        day: item.day ?? undefined,
        comment: item.notes ?? undefined,
        supersetWithNext: item.supersetWithNext ?? undefined,
        restSeconds: item.restSeconds ?? undefined,
        sets: mapWorkoutItemSets(item, resultType)
      };
    }),
    repeatDays: session.repeatDays != null ? [...session.repeatDays] : undefined,
    scheduleTimes: session.scheduleTimes != null ? { ...session.scheduleTimes } : undefined
  };
}

export function mapSession(session: DataApiWorkoutSession, ownerId: OwnerId): WorkoutSession | null {
  if (session.status === "planned") return null;
  const startedAt = session.startedAt ?? session.scheduledAt ?? session.createdAt ?? new Date().toISOString();
  const startedAtTimestamp = session.startedAt ? Date.parse(session.startedAt) : Number.NaN;
  const finishedAtTimestamp = session.finishedAt ? Date.parse(session.finishedAt) : Number.NaN;
  const durationSeconds = Number.isFinite(startedAtTimestamp) && Number.isFinite(finishedAtTimestamp)
    ? Math.max(0, Math.floor((finishedAtTimestamp - startedAtTimestamp) / 1000))
    : undefined;
  return {
    id: session.id,
    ownerId,
    workoutId: session.id,
    clientId: session.clientId ?? undefined,
    status: mapSessionStatus(session.status),
    startedAt,
    completedAt: session.finishedAt ?? undefined,
    durationSeconds,
    workoutTitleSnapshot: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    exercises: (session.items ?? []).map((item) => ({
      id: item.id,
      exerciseId: item.exerciseId ?? item.id,
      exerciseName: item.titleSnapshot,
      exerciseNameSnapshot: item.titleSnapshot,
      resultTypeSnapshot: getExerciseResultType(item.exerciseId ?? item.id, item.titleSnapshot, item.resultType ?? undefined),
      order: item.order,
      day: item.day ?? undefined,
      comment: item.notes ?? undefined,
      supersetWithNext: item.supersetWithNext ?? undefined,
      plannedSetTargets: item.plannedSetTargets?.map((target) => ({
        id: target.id,
        order: target.order,
        values: target.values ? { ...target.values } : undefined,
        targetWeightKg: target.targetWeightKg ?? undefined,
        targetReps: target.targetReps ?? undefined,
        targetDurationSeconds: target.targetDurationSeconds ?? undefined,
        targetDistanceMeters: target.targetDistanceMeters ?? undefined
      })),
      plannedSets: item.plannedSets ?? undefined,
      plannedRepetitions: item.plannedReps ?? undefined,
      plannedWeight: item.plannedWeight ?? undefined,
      plannedDurationSeconds: item.plannedDurationSec ?? undefined,
      restSeconds: item.restSeconds ?? undefined
    }))
  };
}

export function mapResults(session: DataApiWorkoutSession, ownerId: OwnerId): WorkoutResult[] {
  return (session.items ?? []).flatMap((item) =>
    uniqueSetResults(item.setResults).map((result) => {
      const resultType = getExerciseResultType(item.exerciseId ?? item.id, item.titleSnapshot, item.resultType ?? undefined);
      const values = getWeightMetricValues(resultType, result.weight);

      return {
        id: result.id ?? `${item.id}:result:${result.setNumber}`,
        ownerId,
        sessionId: session.id,
        sessionExerciseItemId: item.id,
        exerciseId: item.exerciseId ?? item.id,
        exerciseNameSnapshot: item.titleSnapshot,
        resultType,
        setIndex: result.setNumber,
        values,
        weight: getPrimaryWeightMetricKey(resultType) === "weight" ? result.weight ?? undefined : undefined,
        repetitions: result.reps ?? undefined,
        durationSeconds: result.durationSec ?? undefined,
        distanceMeters: result.distanceMeters ?? undefined,
        completed: Boolean(result.completed)
      };
    })
  );
}

function mapWorkoutItemSets(item: DataApiWorkoutSessionItem, resultType: WorkoutResultType | undefined): Workout["exercises"][number]["sets"] {
  const setResults = uniqueSetResults(item.setResults);

  if (item.plannedSetTargets != null) {
    const targetByOrder = new Map(item.plannedSetTargets.map((target) => [target.order, target]));
    const resultByOrder = new Map(setResults.map((result) => [result.setNumber, result]));
    const orders = Array.from(new Set([...targetByOrder.keys(), ...resultByOrder.keys()])).sort((left, right) => left - right);

    return orders.map((order) => {
      const target = targetByOrder.get(order);
      const result = resultByOrder.get(order);
      const resultValues = getWeightMetricValues(resultType, result?.weight);

      return {
        id: target?.id ?? result?.id ?? `${item.id}:set:${order}`,
        order,
        values: target?.values != null
          ? { ...target.values }
          : resultValues,
        targetWeightKg: target?.targetWeightKg ?? undefined,
        targetReps: target?.targetReps ?? undefined,
        targetDurationSeconds: target?.targetDurationSeconds ?? undefined,
        targetDistanceMeters: target?.targetDistanceMeters ?? undefined,
        actualWeightKg: getPrimaryWeightMetricKey(resultType) === "weight" ? result?.weight ?? undefined : undefined,
        actualReps: result?.reps ?? undefined,
        actualDurationSeconds: result?.durationSec ?? undefined,
        actualDistanceMeters: result?.distanceMeters ?? undefined,
        completed: Boolean(result?.completed)
      };
    });
  }

  const resultBySetNumber = new Map(setResults.map((set) => [set.setNumber, set]));
  const highestResultSetNumber = setResults.reduce((highest, set) => Math.max(highest, set.setNumber), 0);
  const hasPlannedTarget = item.plannedReps != null || item.plannedWeight != null || item.plannedDurationSec != null;
  const plannedSetCount = item.plannedSets ?? (hasPlannedTarget ? 1 : 0);
  const setCount = Math.max(0, plannedSetCount, highestResultSetNumber);
  const sets: DataApiWorkoutSetResult[] = Array.from({ length: setCount }, (_, index) => {
    const setNumber = index + 1;
    return resultBySetNumber.get(setNumber) ?? { id: `${item.id}:planned:${setNumber}`, setNumber, completed: false };
  });

  return sets.map((set) => {
    const plannedValues = getWeightMetricValues(resultType, item.plannedWeight);
    const resultValues = getWeightMetricValues(resultType, set.weight);
    const hasResultValues = set.reps !== undefined || set.durationSec !== undefined || set.distanceMeters !== undefined || set.weight !== undefined;
    const values = { ...plannedValues, ...(hasResultValues ? resultValues : undefined) };

    return {
      id: set.id ?? `${item.id}:set:${set.setNumber}`,
      order: set.setNumber,
      values: Object.keys(values).length > 0 ? values : undefined,
      targetWeightKg: getPrimaryWeightMetricKey(resultType) === "weight" ? item.plannedWeight ?? undefined : undefined,
      targetReps: item.plannedReps ?? undefined,
      targetDurationSeconds: item.plannedDurationSec ?? undefined,
      actualWeightKg: getPrimaryWeightMetricKey(resultType) === "weight" ? set.weight ?? undefined : undefined,
      actualReps: set.reps ?? undefined,
      actualDurationSeconds: set.durationSec ?? undefined,
      actualDistanceMeters: set.distanceMeters ?? undefined,
      completed: Boolean(set.completed)
    };
  });
}

function uniqueSetResults(itemResults: DataApiWorkoutSetResult[] = []) {
  const bySetNumber = new Map<number, DataApiWorkoutSetResult>();
  for (const result of itemResults) {
    bySetNumber.set(result.setNumber, result);
  }
  return Array.from(bySetNumber.values()).sort((left, right) => left.setNumber - right.setNumber);
}

function normalizeExerciseName(name: string | null | undefined) {
  return name?.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU") ?? "";
}

const catalogResultTypeById = new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise.resultType]));
const catalogResultTypeByName = new Map(exerciseCatalog.map((exercise) => [normalizeExerciseName(exercise.name), exercise.resultType]));

function getExerciseResultType(
  exerciseId: string | null | undefined,
  name: string | null | undefined,
  explicitResultType?: WorkoutResultType
): WorkoutResultType | undefined {
  return explicitResultType ?? (exerciseId ? catalogResultTypeById.get(exerciseId) : undefined) ?? catalogResultTypeByName.get(normalizeExerciseName(name));
}

function getWeightMetricValues(type: WorkoutResultType | undefined, weight: number | null | undefined): MetricValues | undefined {
  const metricKey = getPrimaryWeightMetricKey(type);
  if (!metricKey || weight === null || weight === undefined) return undefined;
  return { [metricKey]: weight };
}

function mapWorkoutStatus(status: string): Workout["status"] {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "inProgress";
  if (status === "cancelled") return "cancelled";
  return "planned";
}

function mapSessionStatus(status: string): WorkoutSession["status"] {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "active";
}

function isDeleted(value: { deletedAt?: string | null }) {
  return Boolean(value.deletedAt);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
