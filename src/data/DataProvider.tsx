import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import type { DataLayer } from "./contracts";
import { ActiveSessionConflictError, DataError, DataNotFoundError } from "./contracts";
import { createId } from "./createId";
import { LOCAL_OWNER_ID } from "./types";
import type { DataApi, DataApiClientInput, DataApiWorkoutResultsInput, DataApiWorkoutSession, DataApiWorkoutSessionInput } from "./api/dataApi";
import { mapClient as mapRemoteClient, mapExercise as mapRemoteExercise, mapResults as mapRemoteResults, mapSession as mapRemoteSession, mapWorkout as mapRemoteWorkout } from "./remote/bootstrap";
import { SessionResultWriteQueue } from "./remote/sessionResultWriteQueue";
import { createSessionTimerPersistence, type SessionTimerPersistence } from "./persistence/SessionTimerPersistence";
import type {
  CreateClientInput,
  CreateExerciseInput,
  CreateWorkoutDraftInput,
  ExerciseId,
  OwnerId,
  QuickValue,
  QuickValueMetric,
  RepeatDay,
  RescheduleWorkoutInput,
  SessionId,
  UpdateClientInput,
  UpdateSessionInput,
  UpdateWorkoutDraftInput,
  UpsertWorkoutResultInput,
  Workout,
  WorkoutResult,
  WorkoutResultType,
  WorkoutSession
} from "./types";
import { localReducer, type LocalDataAction } from "./local/localReducer";
import type { LocalDataState } from "./local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "./local/localState";
import { assertUniqueActiveExerciseName, normalizeExercisePatch } from "./local/exerciseValidation";
import { buildWorkoutResultFromSet, buildWorkoutResultFromUpsertInput } from "./local/resultBuilders";
import { selectActiveSessionConflict, selectActiveSessionForWorkout, selectCompletedSessionsByClient, selectPreviousExercisePerformance } from "./local/localSelectors";
import { getAdjacentConnectionIds, getSupersetConnectionIds, preserveSupersetConnectionsAfterReorder, sortWorkoutExercisesByOrder, syncSupersetConnectionsForScope } from "./local/supersetConnections";
import { createProductionState } from "./seeds/productionSeed";
import { CURRENT_SCHEMA_VERSION, createLocalPersistenceAdapter, migrateSnapshot, hydrateDataState, PersistenceCoordinator, type PersistenceAdapter, type PersistenceStatus } from "./persistence";
import { getPrimaryWeightMetricKey, getLegacyValues } from "@/features/workouts/tracking";
import { normalizeEditDraftSchedule } from "@/features/workouts/scheduleDraft";
import { theme } from "@/theme";
import { Button } from "@/components/ui";
import { AppSplashScreen } from "@/features/splash/AppSplashScreen";

type HydrationStatus = "idle" | "loading" | "ready" | "error";
type SaveMode = "debounced" | "immediate";
type AccountDeletionPhase = "active" | "preparing" | "prepared" | "committing" | "committed";

type DataContextValue = {
  state: LocalDataState;
  data: DataLayer;
  currentOwnerId: OwnerId;
  hydrationStatus: HydrationStatus;
  hydrationError: Error | null;
  persistenceStatus: PersistenceStatus;
  retryHydration: () => void;
  sessionTimerPersistence: SessionTimerPersistence;
  prepareAccountDeletion: () => Promise<void>;
  clearAccountData: () => Promise<void>;
  rollbackAccountDeletion: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function optionalTrim(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalTrimList<T extends string>(values?: T[]) {
  const trimmed = values ? trimList(values) : undefined;
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function trimList<T extends string>(values: T[]) {
  return values.map((value) => value.trim()).filter(Boolean) as T[];
}

function normalizeClientIntake(intake: CreateClientInput["intake"] | UpdateClientInput["intake"]): CreateClientInput["intake"] {
  if (!intake) return undefined;

  return {
    ...(intake.ageYears !== undefined ? { ageYears: intake.ageYears } : {}),
    ...(intake.targetWeightKg !== undefined ? { targetWeightKg: intake.targetWeightKg } : {}),
    ...(intake.healthConstraints !== undefined ? { healthConstraints: trimList(intake.healthConstraints) } : {}),
    ...(intake.exerciseRestrictions !== undefined ? { exerciseRestrictions: trimList(intake.exerciseRestrictions) } : {}),
    ...(intake.activityLevel !== undefined ? { activityLevel: intake.activityLevel.trim() } : {}),
    ...(intake.sleep !== undefined ? { sleep: intake.sleep.trim() } : {}),
    ...(intake.workoutsPerWeek !== undefined ? { workoutsPerWeek: intake.workoutsPerWeek } : {}),
    ...(intake.trainingExperience !== undefined ? { trainingExperience: intake.trainingExperience.trim() } : {}),
    ...(intake.sports !== undefined ? { sports: trimList(intake.sports) } : {})
  };
}

function mergeClientIntake(current: CreateClientInput["intake"], patch: UpdateClientInput["intake"]): CreateClientInput["intake"] {
  if (!patch) return current;
  return { ...current, ...normalizeClientIntake(patch) };
}

function requiredTrim(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeTimezone(value?: string) {
  const timezone = optionalTrim(value);

  try {
    return Intl.DateTimeFormat(undefined, timezone ? { timeZone: timezone } : undefined).resolvedOptions().timeZone || "UTC";
  } catch {
    throw new DataError("validation", "Некорректный часовой пояс", { retryable: false });
  }
}

function normalizeIsoDate(value: string, fieldName: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new DataError("validation", `${fieldName} должен быть ISO-датой`, { retryable: false });
  }
  return date.toISOString();
}

function ensureWorkoutDraft(workout: Workout | undefined, id: string) {
  if (!workout || workout.status !== "draft") {
    throw new DataNotFoundError("Workout draft", id);
  }
  return workout;
}

function ensureOwned<T extends { ownerId: OwnerId }>(entity: T | undefined, entityName: string, id: string, ownerId: OwnerId) {
  if (!entity || entity.ownerId !== ownerId) {
    throw new DataNotFoundError(entityName, id);
  }
  return entity;
}

function isOwned<T extends { ownerId: OwnerId }>(entity: T | undefined, ownerId: OwnerId): entity is T {
  return Boolean(entity && entity.ownerId === ownerId);
}

function isAvailableExercise(entity: { ownerId: OwnerId; archivedAt?: string } | undefined, ownerId: OwnerId) {
  return Boolean(entity && entity.ownerId === ownerId && !entity.archivedAt);
}

function validateDraftForPublish(state: LocalDataState, ownerId: OwnerId, draft: Workout) {
  if (draft.clientId && !isOwned(state.clientsById[draft.clientId], ownerId)) {
    throw new DataNotFoundError("Client", draft.clientId);
  }

  draft.exercises.forEach((exercise) => {
    const sourceExercise = state.exercisesById[exercise.exerciseId];
    if (!isOwned(sourceExercise, ownerId)) throw new DataNotFoundError("Exercise", exercise.exerciseId);
    if (sourceExercise.archivedAt) {
      throw new DataError("validation", "В черновике есть архивное упражнение", { retryable: false });
    }
  });

  return {
    startsAt: normalizeIsoDate(draft.startsAt, "Дата тренировки"),
    timezone: normalizeTimezone(draft.timezone)
  };
}

function getSessionsForWorkout(state: LocalDataState, ownerId: OwnerId, workoutId: string) {
  return state.sessionIds.map((id) => state.sessionsById[id]).filter((session) => session.ownerId === ownerId && session.workoutId === workoutId);
}

function hasActiveSession(state: LocalDataState, ownerId: OwnerId, workoutId: string) {
  return Boolean(selectActiveSessionForWorkout(state, ownerId, workoutId));
}

function hasCompletedSession(state: LocalDataState, ownerId: OwnerId, workoutId: string) {
  return getSessionsForWorkout(state, ownerId, workoutId).some((session) => session.status === "completed");
}

function ensureWorkoutCanChangePlan(state: LocalDataState, ownerId: OwnerId, workout: Workout) {
  if (workout.status === "cancelled") throw new Error("Workout is cancelled");
  if (hasActiveSession(state, ownerId, workout.id)) throw new Error("Workout has active session");
  if (hasCompletedSession(state, ownerId, workout.id)) throw new Error("Workout has completed session");
}

function getExerciseName(state: LocalDataState, exerciseId: ExerciseId, ownerId: OwnerId) {
  const exercise = state.exercisesById[exerciseId];
  return isOwned(exercise, ownerId) ? exercise.name : "Упражнение";
}

function getExerciseResultType(state: LocalDataState, exerciseId: ExerciseId, ownerId: OwnerId) {
  const exercise = state.exercisesById[exerciseId];
  return isOwned(exercise, ownerId) ? exercise.resultType : undefined;
}

function createWorkoutExercise(state: LocalDataState, ownerId: OwnerId, exerciseId: ExerciseId, order: number, day?: RepeatDay, existingId?: string) {
  if (!isAvailableExercise(state.exercisesById[exerciseId], ownerId)) {
    throw new DataNotFoundError("Exercise", exerciseId);
  }

  return {
    id: existingId ?? createId("workout-exercise"),
    exerciseId,
    exerciseName: getExerciseName(state, exerciseId, ownerId),
    resultType: getExerciseResultType(state, exerciseId, ownerId) ?? defaultResultType,
    day,
    sets: [],
    order
  };
}

function getExerciseScope(exercise: Workout["exercises"][number]) {
  return exercise.day ?? "";
}

function normalizeWorkoutExerciseOrder(exercises: Workout["exercises"]) {
  const orderByScope: Record<string, number> = {};
  return exercises.map((exercise) => {
    const scope = getExerciseScope(exercise);
    orderByScope[scope] = (orderByScope[scope] ?? 0) + 1;
    return { ...exercise, order: orderByScope[scope] };
  });
}

function getQuickValueId(ownerId: OwnerId, exerciseId: ExerciseId, metric: QuickValueMetric, clientId?: string) {
  return `quick-value:${ownerId}:${clientId ?? "global"}:${exerciseId}:${metric}`;
}

function normalizeQuickValues(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value)))).slice(0, 5);
}

const defaultResultType: WorkoutResultType = "weight_reps";

function getSnapshotSchemaVersion(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  return typeof version === "number" ? version : undefined;
}

function localClientStatusToRemote(status?: CreateClientInput["status"] | UpdateClientInput["status"]): "active" | "archived" | undefined {
  if (status === "paused") return "archived";
  if (status === "active" || status === "new") return "active";
  return undefined;
}

function toRemoteClientIntake(intake: NonNullable<CreateClientInput["intake"]>) {
  const remoteIntake = {
    ...(intake.ageYears !== undefined ? { ageYears: intake.ageYears } : {}),
    ...(intake.targetWeightKg !== undefined ? { targetWeightKg: intake.targetWeightKg } : {}),
    ...(intake.healthConstraints !== undefined ? { healthConstraints: trimList(intake.healthConstraints) } : {}),
    ...(intake.exerciseRestrictions !== undefined ? { exerciseRestrictions: trimList(intake.exerciseRestrictions) } : {}),
    ...(intake.activityLevel !== undefined ? { activityLevel: intake.activityLevel.trim() } : {}),
    ...(intake.sleep !== undefined ? { sleep: intake.sleep.trim() } : {}),
    ...(intake.workoutsPerWeek !== undefined ? { workoutsPerWeek: intake.workoutsPerWeek } : {}),
    ...(intake.trainingExperience !== undefined ? { trainingExperience: intake.trainingExperience.trim() } : {}),
    ...(intake.sports !== undefined ? { sports: trimList(intake.sports) } : {})
  };
  return Object.keys(remoteIntake).length > 0 ? remoteIntake : undefined;
}

function toRemoteClientProfile(input: CreateClientInput | UpdateClientInput): NonNullable<DataApiClientInput["profile"]> | undefined {
  const intake = input.intake !== undefined ? toRemoteClientIntake(input.intake) : undefined;
  const profile: NonNullable<DataApiClientInput["profile"]> = {
    ...(input.telegram !== undefined ? { telegram: input.telegram.trim() } : {}),
    ...(input.gender !== undefined ? { gender: input.gender } : {}),
    ...(input.goal !== undefined ? { goal: input.goal.trim() } : {}),
    ...(input.restrictions !== undefined ? { restrictions: trimList(input.restrictions) } : {}),
    ...(input.metrics !== undefined
      ? {
          metrics: {
            ...(input.metrics.weightKg !== undefined ? { weightKg: input.metrics.weightKg } : {}),
            ...(input.metrics.heightCm !== undefined ? { heightCm: input.metrics.heightCm } : {}),
            ...(input.metrics.attendanceRate !== undefined ? { attendanceRate: input.metrics.attendanceRate } : {})
          }
        }
      : {}),
    ...(intake !== undefined ? { intake } : {})
  };
  return Object.keys(profile).length > 0 ? profile : undefined;
}

function toRemoteClientInput(input: CreateClientInput | UpdateClientInput): DataApiClientInput {
  const profile = toRemoteClientProfile(input);
  return {
    ...(input.name !== undefined ? { name: requiredTrim(input.name, "Новый клиент") } : {}),
    ...(input.phone !== undefined ? { phone: optionalTrim(input.phone) ?? null } : {}),
    ...(input.email !== undefined ? { email: optionalTrim(input.email) ?? null } : {}),
    ...(input.birthDate !== undefined ? { birthDate: optionalTrim(input.birthDate) ?? null } : {}),
    ...(input.notes !== undefined ? { notes: optionalTrim(input.notes) ?? null } : {}),
    ...(profile ? { profile } : {}),
    ...(input.status !== undefined ? { status: localClientStatusToRemote(input.status) } : {})
  };
}

function toRemoteExerciseInput(input: CreateExerciseInput) {
  return {
    name: requiredTrim(input.name, "Новое упражнение"),
    muscleGroup: optionalTrimList(input.primaryMuscles)?.[0] ?? null,
    equipment: optionalTrim(input.equipment) ?? null,
    description: optionalTrim(input.notes) ?? optionalTrim(input.coachNotes) ?? null
  };
}

function toRemoteExercisePatch(input: Partial<CreateExerciseInput>) {
  return {
    ...(input.name !== undefined ? { name: requiredTrim(input.name, "Новое упражнение") } : {}),
    ...(input.primaryMuscles !== undefined ? { muscleGroup: optionalTrimList(input.primaryMuscles)?.[0] ?? null } : {}),
    ...(input.equipment !== undefined ? { equipment: optionalTrim(input.equipment) ?? null } : {}),
    ...(input.notes !== undefined || input.coachNotes !== undefined ? { description: optionalTrim(input.notes) ?? optionalTrim(input.coachNotes) ?? null } : {})
  };
}

function workoutToRemoteItems(workout: Workout): NonNullable<DataApiWorkoutSessionInput["items"]> {
  return workout.exercises.map((exercise, index) => {
    const firstSetValues = getLegacyValues({
      values: exercise.sets[0]?.values,
      weight: exercise.sets[0]?.targetWeightKg,
      reps: exercise.sets[0]?.targetReps,
      durationSeconds: exercise.sets[0]?.targetDurationSeconds,
      distanceMeters: exercise.sets[0]?.targetDistanceMeters
    });
    const weightMetricKey = getPrimaryWeightMetricKey(exercise.resultType);

    return {
      exerciseId: exercise.exerciseId,
      order: exercise.order ?? index + 1,
      titleSnapshot: exercise.exerciseName,
      plannedSets: exercise.sets.length || null,
      plannedReps: exercise.sets[0]?.targetReps ?? firstSetValues.reps ?? null,
      plannedWeight: weightMetricKey ? firstSetValues[weightMetricKey] ?? null : null,
      plannedDurationSec: exercise.sets[0]?.targetDurationSeconds ?? firstSetValues.duration ?? null,
      notes: exercise.comment ?? null
    };
  });
}

function workoutToRemoteSessionInput(workout: Workout, status: DataApiWorkoutSessionInput["status"] = "planned"): DataApiWorkoutSessionInput & { title: string } {
  return {
    clientId: workout.clientId ?? null,
    title: workout.title || "Тренировка",
    status,
    scheduledAt: normalizeIsoDate(workout.startsAt, "Дата тренировки"),
    notes: workout.focus || null,
    items: workoutToRemoteItems(workout)
  };
}

function sessionExercisesToRemoteItems(exercises: WorkoutSession["exercises"]): NonNullable<DataApiWorkoutSessionInput["items"]> {
  return exercises.map((exercise, index) => ({
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    order: exercise.order ?? index + 1,
    titleSnapshot: exercise.exerciseNameSnapshot ?? exercise.exerciseName,
    plannedSets: exercise.plannedSets ?? null,
    plannedReps: exercise.plannedRepetitions ?? null,
    plannedWeight: exercise.plannedWeight ?? null,
    notes: exercise.comment ?? null
  }));
}

function remoteSessionActions(session: DataApiWorkoutSession, ownerId: OwnerId): LocalDataAction[] {
  const actions: LocalDataAction[] = [{ type: "workout/upsert", workout: mapRemoteWorkout(session, ownerId) }];
  const localSession = mapRemoteSession(session, ownerId);
  if (localSession) {
    actions.push({ type: "session/upsert", session: localSession });
    actions.push(...mapRemoteResults(session, ownerId).map((result) => ({ type: "result/upsert" as const, result })));
  }
  return actions;
}

function toRemoteSetResult(result: WorkoutResult) {
  const values = getLegacyValues({
    values: result.values,
    weight: result.weight,
    repetitions: result.repetitions,
    durationSeconds: result.durationSeconds,
    distanceMeters: result.distanceMeters
  });
  const weightMetricKey = getPrimaryWeightMetricKey(result.resultType);
  return {
    id: result.id,
    setNumber: result.setIndex,
    reps: values.reps ?? null,
    weight: weightMetricKey ? values[weightMetricKey] ?? null : null,
    durationSec: values.duration ?? null,
    distanceMeters: values.distance ?? null,
    completed: result.completed
  };
}

function resultsToRemoteInput(results: WorkoutResult[]): DataApiWorkoutResultsInput {
  const byItem = new Map<string, DataApiWorkoutResultsInput["items"][number]>();
  for (const result of results) {
    const itemId = result.sessionExerciseItemId;
    if (!itemId) continue;
    const item = byItem.get(itemId) ?? { id: itemId, setResults: [] };
    item.setResults.push(toRemoteSetResult(result));
    byItem.set(itemId, item);
  }

  for (const item of byItem.values()) {
    item.setResults.sort((left, right) => left.setNumber - right.setNumber);
  }
  return { items: Array.from(byItem.values()) };
}

function toRemoteResultsInput(state: LocalDataState, ownerId: OwnerId, input: UpsertWorkoutResultInput, resultId: string): DataApiWorkoutResultsInput {
  const currentResults = state.resultIds
    .map((id) => state.resultsById[id])
    .filter((result) => result.ownerId === ownerId && result.sessionId === input.sessionId && result.id !== resultId);
  const nextResult = buildWorkoutResultFromUpsertInput({ id: resultId, ownerId, upsert: input });
  const resultsBySet = new Map<string, typeof nextResult>();
  for (const result of [...currentResults, nextResult]) {
    const itemId = result.sessionExerciseItemId;
    if (!itemId) continue;
    resultsBySet.set(`${itemId}:${result.setIndex}`, result);
  }
  return resultsToRemoteInput(Array.from(resultsBySet.values()));
}

export function DataProvider({
  children,
  persistenceAdapter,
  currentOwnerId = LOCAL_OWNER_ID,
  bootstrapRemoteData,
  dataApi
}: {
  children: ReactNode;
  persistenceAdapter?: PersistenceAdapter;
  currentOwnerId?: OwnerId;
  bootstrapRemoteData?: () => Promise<LocalDataState | null>;
  dataApi?: DataApi;
}) {
  const effectivePersistenceAdapter = useMemo(() => persistenceAdapter ?? createLocalPersistenceAdapter(currentOwnerId), [currentOwnerId, persistenceAdapter]);
  const [state, dispatch] = useReducer(localReducer, undefined, createProductionState);
  const stateRef = useRef(state);
  const coordinatorRef = useRef(new PersistenceCoordinator(effectivePersistenceAdapter));
  const sessionWriteQueueRef = useRef(new SessionResultWriteQueue());
  const sessionTimerPersistence = useMemo(() => createSessionTimerPersistence(currentOwnerId), [currentOwnerId]);
  const accountDeletionPhaseRef = useRef<AccountDeletionPhase>("active");
  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>("idle");
  const hydrationStatusRef = useRef<HydrationStatus>("idle");
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>("idle");
  const [hydrationError, setHydrationError] = useState<Error | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    coordinatorRef.current = new PersistenceCoordinator(effectivePersistenceAdapter);
  }, [effectivePersistenceAdapter]);

  const updateHydrationStatus = useCallback((status: HydrationStatus) => {
    hydrationStatusRef.current = status;
    setHydrationStatus(status);
  }, []);

  const hydrateLocalData = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      const isBlocked = () => accountDeletionPhaseRef.current !== "active";
      if (isBlocked()) return;
      updateHydrationStatus("loading");
      setHydrationError(null);

      try {
        const rawSnapshot = await effectivePersistenceAdapter.load();
        const snapshot = rawSnapshot ? migrateSnapshot(rawSnapshot) : null;
        let nextState = snapshot ? hydrateDataState(snapshot) : createProductionState();
        const shouldWriteCurrentSnapshot = !rawSnapshot || getSnapshotSchemaVersion(rawSnapshot) !== CURRENT_SCHEMA_VERSION;

        if (isCancelled() || isBlocked()) return;

        stateRef.current = nextState;
        dispatch({ type: "state/replace", state: nextState });

        if (bootstrapRemoteData) {
          try {
            const remoteState = await bootstrapRemoteData();
            if (remoteState && !isCancelled() && !isBlocked()) {
              nextState = remoteState;
              stateRef.current = nextState;
              dispatch({ type: "state/replace", state: nextState });
              await coordinatorRef.current.saveImmediately(nextState);
            }
          } catch (error) {
            if (!snapshot) throw error;
            if (__DEV__) {
              console.warn("Remote data bootstrap failed; using local cache", error);
            }
          }
        }

        if (shouldWriteCurrentSnapshot && !isBlocked()) {
          await coordinatorRef.current.saveImmediately(nextState);
        }

        if (isCancelled() || isBlocked()) return;

        updateHydrationStatus("ready");
        setPersistenceStatus(coordinatorRef.current.getStatus());
      } catch (error) {
        if (__DEV__) {
          console.warn("Local data hydration failed", error);
        }
        if (isCancelled() || isBlocked()) return;
        setHydrationError(error instanceof Error ? error : new Error("Local data hydration failed"));
        updateHydrationStatus("error");
        setPersistenceStatus(coordinatorRef.current.getStatus());
      }
    },
    [bootstrapRemoteData, effectivePersistenceAdapter, updateHydrationStatus]
  );

  const commitActions = useCallback(async (actions: LocalDataAction[], mode: SaveMode = "debounced") => {
    if (accountDeletionPhaseRef.current !== "active") {
      throw new DataError("validation", "Удаление аккаунта уже выполняется", { retryable: false });
    }
    const nextState = actions.reduce(localReducer, stateRef.current);
    stateRef.current = nextState;
    actions.forEach(dispatch);

    if (hydrationStatusRef.current !== "ready") return;

    if (mode === "immediate") {
      await coordinatorRef.current.saveImmediately(nextState);
      setPersistenceStatus(coordinatorRef.current.getStatus());
      return;
    }

    coordinatorRef.current.scheduleSave(nextState);
    setPersistenceStatus(coordinatorRef.current.getStatus());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void hydrateLocalData(() => cancelled);

    return () => {
      cancelled = true;
      coordinatorRef.current.cancelPending();
    };
  }, [hydrateLocalData]);

  useEffect(() => {
    if (hydrationStatus !== "ready") return undefined;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "inactive" && nextAppState !== "background") return;

      void coordinatorRef.current.flush().finally(() => {
        setPersistenceStatus(coordinatorRef.current.getStatus());
      });
    });

    return () => subscription.remove();
  }, [hydrationStatus]);

  const resetLocalData = useCallback(async () => {
    const nextState = createProductionState();

    await effectivePersistenceAdapter.clear();
    stateRef.current = nextState;
    dispatch({ type: "state/replace", state: nextState });
    await coordinatorRef.current.saveImmediately(nextState);
    setHydrationError(null);
    updateHydrationStatus("ready");
    setPersistenceStatus(coordinatorRef.current.getStatus());
  }, [effectivePersistenceAdapter, updateHydrationStatus]);

  const prepareAccountDeletion = useCallback(async () => {
    if (accountDeletionPhaseRef.current !== "active") {
      throw new Error("Account deletion cleanup is already active");
    }

    accountDeletionPhaseRef.current = "preparing";
    try {
      await sessionWriteQueueRef.current.pauseAndDrain();
      await coordinatorRef.current.pauseAndDrain();
      await sessionTimerPersistence.pauseAndDrain();
      accountDeletionPhaseRef.current = "prepared";
    } catch (error) {
      accountDeletionPhaseRef.current = "active";
      sessionWriteQueueRef.current.resume();
      coordinatorRef.current.resume();
      sessionTimerPersistence.resume();
      throw error;
    }
  }, [sessionTimerPersistence]);

  const rollbackAccountDeletion = useCallback(async () => {
    if (accountDeletionPhaseRef.current === "committed") return;
    accountDeletionPhaseRef.current = "active";
    sessionWriteQueueRef.current.resume();
    coordinatorRef.current.resume();
    sessionTimerPersistence.resume();
  }, [sessionTimerPersistence]);

  const clearAccountData = useCallback(async () => {
    if (accountDeletionPhaseRef.current === "committed") return;
    if (accountDeletionPhaseRef.current !== "prepared" && accountDeletionPhaseRef.current !== "committing") {
      throw new Error("Account deletion cleanup was not prepared");
    }

    accountDeletionPhaseRef.current = "committing";
    const sessionIds = [...stateRef.current.sessionIds];
    try {
      await sessionWriteQueueRef.current.close();
      // Timer cleanup reads owner snapshots to classify legacy v1 keys, so it
      // must finish before the owner snapshot itself is removed.
      await sessionTimerPersistence.closeAndClearOwner(sessionIds);
      await coordinatorRef.current.closeAndClear();
    } catch (error) {
      // All cleanup primitives are idempotent. Keep the phase retryable after
      // the server has already confirmed deletion.
      accountDeletionPhaseRef.current = "prepared";
      throw error;
    }

    const nextState = createProductionState();
    stateRef.current = nextState;
    dispatch({ type: "state/replace", state: nextState });
    setHydrationError(null);
    updateHydrationStatus("ready");
    setPersistenceStatus("idle");
    accountDeletionPhaseRef.current = "committed";
  }, [sessionTimerPersistence, updateHydrationStatus]);

  const data = useMemo<DataLayer>(() => {
    return {
      clients: {
        async list() {
          const currentState = stateRef.current;
          return currentState.clientIds
            .map((id) => currentState.clientsById[id])
            .filter((client) => isOwned(client, currentOwnerId))
            .map(cloneClient);
        },
        async getById(id) {
          const currentState = stateRef.current;
          const client = currentState.clientsById[id];
          return isOwned(client, currentOwnerId) ? cloneClient(client) : null;
        },
        async create(input: CreateClientInput) {
          if (dataApi) {
            const remoteInput = toRemoteClientInput(input);
            const client = mapRemoteClient(await dataApi.createClient({ ...remoteInput, name: requiredTrim(input.name, "Новый клиент") }), currentOwnerId);
            await commitActions([{ type: "client/upsert", client }], "immediate");
            return cloneClient(client);
          }

          const now = new Date().toISOString();
          const name = requiredTrim(input.name, "Новый клиент");
          const client = {
            id: createId("client"),
            ownerId: currentOwnerId,
            name,
            phone: optionalTrim(input.phone),
            email: optionalTrim(input.email),
            birthDate: optionalTrim(input.birthDate),
            telegram: optionalTrim(input.telegram),
            gender: input.gender,
            goal: optionalTrim(input.goal) ?? "Новая цель",
            status: input.status ?? "new",
            avatarInitials: input.avatarInitials ?? getInitials(name),
            nextWorkoutAt: input.nextWorkoutAt ?? new Date().toISOString(),
            notes: optionalTrim(input.notes) ?? "",
            restrictions: input.restrictions !== undefined ? trimList(input.restrictions) : undefined,
            intake: normalizeClientIntake(input.intake),
            createdAt: now,
            updatedAt: now,
            metrics: {
              weightKg: input.metrics?.weightKg ?? 0,
              heightCm: input.metrics?.heightCm ?? 0,
              attendanceRate: input.metrics?.attendanceRate ?? 100
            }
          };
          await commitActions([{ type: "client/upsert", client }], "immediate");
          return cloneClient(client);
        },
        async update(id, patch: UpdateClientInput) {
          const currentState = stateRef.current;
          const current = ensureOwned(currentState.clientsById[id], "Client", id, currentOwnerId);

          if (dataApi) {
            const client = mapRemoteClient(await dataApi.updateClient(id, toRemoteClientInput(patch)), currentOwnerId);
            await commitActions([{ type: "client/upsert", client }], "immediate");
            return cloneClient(client);
          }

          const client = {
            ...current,
            ...patch,
            id: current.id,
            name: patch.name !== undefined ? requiredTrim(patch.name, current.name) : current.name,
            phone: patch.phone !== undefined ? optionalTrim(patch.phone) : current.phone,
            email: patch.email !== undefined ? optionalTrim(patch.email) : current.email,
            birthDate: patch.birthDate !== undefined ? optionalTrim(patch.birthDate) : current.birthDate,
            telegram: patch.telegram !== undefined ? optionalTrim(patch.telegram) : current.telegram,
            gender: patch.gender !== undefined ? patch.gender : current.gender,
            goal: patch.goal !== undefined ? optionalTrim(patch.goal) ?? "" : current.goal,
            notes: patch.notes !== undefined ? optionalTrim(patch.notes) ?? "" : current.notes,
            restrictions: patch.restrictions !== undefined ? trimList(patch.restrictions) : current.restrictions,
            intake: patch.intake !== undefined ? mergeClientIntake(current.intake, patch.intake) : current.intake,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString(),
            metrics: patch.metrics ? { ...current.metrics, ...patch.metrics } : current.metrics
          };
          await commitActions([{ type: "client/upsert", client }], "immediate");
          return cloneClient(client);
        },
        async remove(id) {
          ensureOwned(stateRef.current.clientsById[id], "Client", id, currentOwnerId);

          if (dataApi) {
            await dataApi.deleteClient(id);
          }

          await commitActions([{ type: "client/remove", clientId: id }], "immediate");
        }
      },
      exercises: {
        async list() {
          const currentState = stateRef.current;
          return currentState.exerciseIds
            .map((id) => currentState.exercisesById[id])
            .filter((exercise) => isOwned(exercise, currentOwnerId))
            .map(cloneExercise)
            .filter((exercise) => !exercise.archivedAt);
        },
        async getById(id) {
          const exercise = stateRef.current.exercisesById[id];
          return isOwned(exercise, currentOwnerId) ? cloneExercise(exercise) : null;
        },
        async create(input: CreateExerciseInput) {
          if (dataApi) {
            const remoteInput = toRemoteExerciseInput(input);
            assertUniqueActiveExerciseName(stateRef.current, { ownerId: currentOwnerId, name: remoteInput.name });
            const exercise = mapRemoteExercise(await dataApi.createExercise(remoteInput), currentOwnerId);
            await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
            return cloneExercise(exercise);
          }

          const now = new Date().toISOString();
          const name = requiredTrim(input.name, "Новое упражнение");
          assertUniqueActiveExerciseName(stateRef.current, { ownerId: currentOwnerId, name });
          const exercise = {
            id: createId("exercise"),
            ownerId: currentOwnerId,
            name,
            category: input.category ?? "strength",
            source: "custom" as const,
            primaryMuscles: optionalTrimList(input.primaryMuscles) ?? ["all"],
            secondaryMuscles: optionalTrimList(input.secondaryMuscles),
            equipment: optionalTrim(input.equipment) ?? "Не указано",
            resultType: input.resultType,
            searchAliases: optionalTrimList(input.searchAliases),
            restrictionTags: optionalTrimList(input.restrictionTags),
            coachNotes: optionalTrim(input.coachNotes),
            notes: optionalTrim(input.notes),
            createdAt: now,
            updatedAt: now
          };
          await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
          return cloneExercise(exercise);
        },
        async update(id, patch) {
          const currentState = stateRef.current;
          const current = ensureOwned(currentState.exercisesById[id], "Exercise", id, currentOwnerId);
          if (current.source !== "custom") {
            throw new DataError("validation", "Можно редактировать только свои упражнения", { retryable: false });
          }

          const normalizedPatch = normalizeExercisePatch(patch);
          const name = normalizedPatch.name !== undefined ? requiredTrim(normalizedPatch.name, current.name) : current.name;
          if (normalizedPatch.name !== undefined) {
            assertUniqueActiveExerciseName(currentState, { ownerId: currentOwnerId, name, excludeExerciseId: id });
          }

          if (dataApi) {
            const exercise = mapRemoteExercise(await dataApi.updateExercise(id, toRemoteExercisePatch(normalizedPatch)), currentOwnerId);
            await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
            return cloneExercise(exercise);
          }

          const exercise = cloneExercise({
            ...current,
            ...normalizedPatch,
            id: current.id,
            ownerId: current.ownerId,
            source: current.source,
            name,
            primaryMuscles: normalizedPatch.primaryMuscles !== undefined ? optionalTrimList(normalizedPatch.primaryMuscles) ?? ["all"] : current.primaryMuscles,
            secondaryMuscles: normalizedPatch.secondaryMuscles !== undefined ? optionalTrimList(normalizedPatch.secondaryMuscles) : current.secondaryMuscles,
            equipment: normalizedPatch.equipment !== undefined ? optionalTrim(normalizedPatch.equipment) ?? "Не указано" : current.equipment,
            resultType: normalizedPatch.resultType !== undefined ? normalizedPatch.resultType : current.resultType,
            searchAliases: normalizedPatch.searchAliases !== undefined ? optionalTrimList(normalizedPatch.searchAliases) : current.searchAliases,
            restrictionTags: normalizedPatch.restrictionTags !== undefined ? optionalTrimList(normalizedPatch.restrictionTags) : current.restrictionTags,
            coachNotes: normalizedPatch.coachNotes !== undefined ? optionalTrim(normalizedPatch.coachNotes) : current.coachNotes,
            notes: normalizedPatch.notes !== undefined ? optionalTrim(normalizedPatch.notes) : current.notes,
            archivedAt: current.archivedAt,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
          return cloneExercise(exercise);
        },
        async archive(id) {
          const current = ensureOwned(stateRef.current.exercisesById[id], "Exercise", id, currentOwnerId);
          if (current.source !== "custom") {
            throw new DataError("validation", "Можно архивировать только свои упражнения", { retryable: false });
          }
          if (dataApi) {
            const exercise = mapRemoteExercise(await dataApi.deleteExercise(id), currentOwnerId);
            await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
            return cloneExercise(exercise);
          }
          const exercise = cloneExercise({
            ...current,
            archivedAt: current.archivedAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
          return cloneExercise(exercise);
        }
      },
      workouts: {
        async list() {
          const currentState = stateRef.current;
          return currentState.workoutIds
            .map((id) => currentState.workoutsById[id])
            .filter((workout) => isOwned(workout, currentOwnerId))
            .map(cloneWorkout);
        },
        async getById(id) {
          const workout = stateRef.current.workoutsById[id];
          return isOwned(workout, currentOwnerId) ? cloneWorkout(workout) : null;
        },
        async createDraft(input: CreateWorkoutDraftInput = {}) {
          const currentState = stateRef.current;
          if (input.clientId && !isOwned(currentState.clientsById[input.clientId], currentOwnerId)) {
            throw new DataNotFoundError("Client", input.clientId);
          }

          const now = new Date().toISOString();
          const workout: Workout = {
            id: createId("workout"),
            ownerId: currentOwnerId,
            clientId: input.clientId,
            title: input.title ?? "Новая тренировка",
            startsAt: input.startsAt ? normalizeIsoDate(input.startsAt, "Дата тренировки") : new Date().toISOString(),
            timezone: normalizeTimezone(input.timezone),
            durationMinutes: input.durationMinutes ?? 60,
            focus: input.focus ?? "",
            location: input.location ?? "Зал",
            status: "draft",
            createdAt: now,
            updatedAt: now,
            exercises: [],
            repeatDays: input.repeatDays,
            scheduleTimes: input.scheduleTimes
          };
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async updateDraft(draftId, patch: UpdateWorkoutDraftInput) {
          const currentState = stateRef.current;
          const current = ensureWorkoutDraft(ensureOwned(currentState.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          if (patch.clientId && !isOwned(currentState.clientsById[patch.clientId], currentOwnerId)) {
            throw new DataNotFoundError("Client", patch.clientId);
          }
          patch.exercises?.forEach((exercise) => {
            if (!isAvailableExercise(currentState.exercisesById[exercise.exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", exercise.exerciseId);
          });

          const workout = cloneWorkout({
            ...current,
            ...patch,
            startsAt: patch.startsAt !== undefined ? normalizeIsoDate(patch.startsAt, "Дата тренировки") : current.startsAt,
            timezone: patch.timezone !== undefined ? normalizeTimezone(patch.timezone) : current.timezone,
            updatedAt: new Date().toISOString(),
            exercises: patch.exercises ?? current.exercises,
            repeatDays: patch.repeatDays ?? current.repeatDays,
            scheduleTimes: patch.scheduleTimes ?? current.scheduleTimes
          });
          await commitActions([{ type: "workout/upsert", workout }]);
          return cloneWorkout(workout);
        },
        async setDraftClient(draftId, clientId) {
          const currentState = stateRef.current;
          const current = ensureWorkoutDraft(ensureOwned(currentState.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          if (!isOwned(currentState.clientsById[clientId], currentOwnerId)) throw new DataNotFoundError("Client", clientId);

          const workout = cloneWorkout({ ...current, clientId, updatedAt: new Date().toISOString() });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async setDraftExercises(draftId, exerciseIds, options = {}) {
          const currentState = stateRef.current;
          const current = ensureWorkoutDraft(ensureOwned(currentState.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          exerciseIds.forEach((exerciseId) => {
            if (!isAvailableExercise(currentState.exercisesById[exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", exerciseId);
          });

          const scopedExercises = current.exercises.filter((exercise) => exercise.day === options.day);
          const scopedConnectionIds = getSupersetConnectionIds(scopedExercises);
          const existingByExerciseId = Object.fromEntries(scopedExercises.map((exercise) => [exercise.exerciseId, exercise]));
          const nextScopedExercises = exerciseIds.map((exerciseId, index) => {
            const existing = existingByExerciseId[exerciseId];
            return existing ? { ...existing, order: index + 1, day: options.day } : createWorkoutExercise(currentState, currentOwnerId, exerciseId, index + 1, options.day);
          });
          const nextScopedIds = nextScopedExercises.map((exercise) => exercise.id);
          const validConnectionIds = new Set(getAdjacentConnectionIds(nextScopedIds));
          const nextConnectionIds = scopedConnectionIds.filter((connectionId) => validConnectionIds.has(connectionId));
          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: syncSupersetConnectionsForScope([
              ...current.exercises.filter((exercise) => exercise.day !== options.day),
              ...nextScopedExercises
            ], options.day, nextConnectionIds)
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async updateDraftExercise(draftId, itemId, patch) {
          const current = ensureWorkoutDraft(ensureOwned(stateRef.current.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          if (!current.exercises.some((exercise) => exercise.id === itemId)) throw new DataNotFoundError("Workout exercise", itemId);

          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: current.exercises.map((exercise) => (exercise.id === itemId ? { ...exercise, ...patch, sets: patch.sets ?? exercise.sets } : exercise))
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async removeDraftExercise(draftId, itemId) {
          const current = ensureWorkoutDraft(ensureOwned(stateRef.current.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          const removedExercise = current.exercises.find((exercise) => exercise.id === itemId);
          if (!removedExercise) throw new DataNotFoundError("Workout exercise", itemId);

          const removedScope = getExerciseScope(removedExercise);
          const scopedExercises = current.exercises.filter((exercise) => getExerciseScope(exercise) === removedScope);
          const scopedConnectionIds = getSupersetConnectionIds(scopedExercises);
          const nextScopedIds = sortWorkoutExercisesByOrder(scopedExercises)
            .filter((exercise) => exercise.id !== itemId)
            .map((exercise) => exercise.id);
          const validConnectionIds = new Set(getAdjacentConnectionIds(nextScopedIds));
          const nextConnectionIds = scopedConnectionIds.filter((connectionId) => validConnectionIds.has(connectionId));

          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: syncSupersetConnectionsForScope(normalizeWorkoutExerciseOrder(current.exercises.filter((exercise) => exercise.id !== itemId)), removedScope, nextConnectionIds)
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async reorderDraftExercises(draftId, orderedItemIds) {
          const current = ensureWorkoutDraft(ensureOwned(stateRef.current.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          const orderIndexById = Object.fromEntries(orderedItemIds.map((id, index) => [id, index]));
          const orderedExercise = current.exercises.find((exercise) => orderedItemIds.includes(exercise.id));
          if (!orderedExercise) return cloneWorkout(current);

          const orderedScope = getExerciseScope(orderedExercise);
          const scopedExercises = current.exercises.filter((exercise) => getExerciseScope(exercise) === orderedScope);
          const currentScopedIds = sortWorkoutExercisesByOrder(scopedExercises).map((exercise) => exercise.id);
          const currentConnectionIds = getSupersetConnectionIds(scopedExercises);
          const nextConnectionIds = preserveSupersetConnectionsAfterReorder(currentScopedIds, orderedItemIds, currentConnectionIds);
          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: syncSupersetConnectionsForScope(
              current.exercises.map((exercise) =>
                getExerciseScope(exercise) === orderedScope && orderIndexById[exercise.id] !== undefined
                  ? { ...exercise, order: orderIndexById[exercise.id] + 1 }
                  : exercise
              ),
              orderedScope,
              nextConnectionIds
            )
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async addExercise(draftId, exerciseId) {
          const currentState = stateRef.current;
          const current = ensureWorkoutDraft(ensureOwned(currentState.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          if (!isAvailableExercise(currentState.exercisesById[exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", exerciseId);
          if (current.exercises.some((exercise) => exercise.exerciseId === exerciseId)) return cloneWorkout(current);

          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: [...current.exercises, createWorkoutExercise(currentState, currentOwnerId, exerciseId, current.exercises.length + 1)]
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async removeExercise(draftId, exerciseId) {
          const current = ensureWorkoutDraft(ensureOwned(stateRef.current.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: current.exercises.filter((exercise) => exercise.exerciseId !== exerciseId)
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async createEditDraft(workoutId) {
          const currentState = stateRef.current;
          const source = ensureOwned(currentState.workoutsById[workoutId], "Workout", workoutId, currentOwnerId);
          ensureWorkoutCanChangePlan(currentState, currentOwnerId, source);

          const existingDraft = currentState.workoutIds
            .map((id) => currentState.workoutsById[id])
            .find((workout) => workout.ownerId === currentOwnerId && workout.status === "draft" && workout.sourceWorkoutId === workoutId);
          if (existingDraft) {
            const normalizedDraft = normalizeEditDraftSchedule(existingDraft);
            if (normalizedDraft !== existingDraft) {
              await commitActions([{ type: "workout/upsert", workout: normalizedDraft }], "immediate");
            }
            return cloneWorkout(normalizedDraft);
          }

          const now = new Date().toISOString();
          const draft = cloneWorkout(
            normalizeEditDraftSchedule({
              ...source,
              id: createId("workout"),
              status: "draft",
              sourceWorkoutId: source.id,
              createdAt: now,
              updatedAt: now,
              exercises: source.exercises.map((exercise) => ({
                ...exercise,
                id: createId("workout-exercise"),
                sets: exercise.sets.map((set) => ({ ...set, id: createId("set") }))
              }))
            })
          );
          await commitActions([{ type: "workout/upsert", workout: draft }], "immediate");
          return cloneWorkout(draft);
        },
        async applyEditDraft(draftId) {
          const currentState = stateRef.current;
          const draft = ensureWorkoutDraft(ensureOwned(currentState.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          const sourceWorkoutId = draft.sourceWorkoutId;
          if (!sourceWorkoutId) return this.publishDraft(draftId);

          const source = ensureOwned(currentState.workoutsById[sourceWorkoutId], "Workout", sourceWorkoutId, currentOwnerId);
          ensureWorkoutCanChangePlan(currentState, currentOwnerId, source);
          const publishMeta = validateDraftForPublish(currentState, currentOwnerId, draft);

          if (dataApi) {
            const remoteSession = await dataApi.updateWorkoutSession(sourceWorkoutId, {
              ...workoutToRemoteSessionInput({ ...draft, startsAt: publishMeta.startsAt, timezone: publishMeta.timezone, status: "planned" }, "planned"),
              scheduledAt: publishMeta.startsAt
            });
            await commitActions([...remoteSessionActions(remoteSession, currentOwnerId), { type: "workout/remove", workoutId: draft.id }], "immediate");
            return cloneWorkout(mapRemoteWorkout(remoteSession, currentOwnerId));
          }

          const workout = cloneWorkout({
            ...source,
            clientId: draft.clientId,
            title: draft.title || source.title,
            startsAt: publishMeta.startsAt,
            timezone: publishMeta.timezone,
            durationMinutes: draft.durationMinutes,
            focus: draft.focus,
            location: draft.location,
            repeatDays: draft.repeatDays,
            scheduleTimes: draft.scheduleTimes,
            exercises: draft.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set })) })),
            status: "planned",
            updatedAt: new Date().toISOString()
          });
          await commitActions(
            [
              { type: "workout/upsert", workout },
              { type: "workout/remove", workoutId: draft.id }
            ],
            "immediate"
          );
          return cloneWorkout(workout);
        },
        async publishDraft(draftId) {
          const currentState = stateRef.current;
          const current = ensureWorkoutDraft(ensureOwned(currentState.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          if (current.sourceWorkoutId) return this.applyEditDraft(draftId);
          const publishMeta = validateDraftForPublish(currentState, currentOwnerId, current);
          if (dataApi) {
            const remoteSession = await dataApi.createWorkoutSession({
              ...workoutToRemoteSessionInput({ ...current, startsAt: publishMeta.startsAt, timezone: publishMeta.timezone, status: "planned" }, "planned"),
              scheduledAt: publishMeta.startsAt
            });
            await commitActions([...remoteSessionActions(remoteSession, currentOwnerId), { type: "workout/remove", workoutId: current.id }], "immediate");
            return cloneWorkout(mapRemoteWorkout(remoteSession, currentOwnerId));
          }
          const workout = cloneWorkout({
            ...current,
            title: current.title || "Тренировка",
            startsAt: publishMeta.startsAt,
            timezone: publishMeta.timezone,
            status: "planned",
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async discardDraft(draftId) {
          ensureWorkoutDraft(ensureOwned(stateRef.current.workoutsById[draftId], "Workout draft", draftId, currentOwnerId), draftId);
          await commitActions([{ type: "workout/remove", workoutId: draftId }], "immediate");
        },
        async reschedule(workoutId, input: RescheduleWorkoutInput) {
          const currentState = stateRef.current;
          const current = ensureOwned(currentState.workoutsById[workoutId], "Workout", workoutId, currentOwnerId);
          ensureWorkoutCanChangePlan(currentState, currentOwnerId, current);
          const startsAt = new Date(input.startsAt);
          if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid workout date");

          if (dataApi) {
            const remoteSession = await dataApi.updateWorkoutSession(workoutId, {
              scheduledAt: startsAt.toISOString()
            });
            await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
            return cloneWorkout(mapRemoteWorkout(remoteSession, currentOwnerId));
          }

          const workout = cloneWorkout({
            ...current,
            startsAt: startsAt.toISOString(),
            timezone: normalizeTimezone(input.timezone ?? current.timezone),
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async cancel(workoutId, input = {}) {
          const currentState = stateRef.current;
          const current = ensureOwned(currentState.workoutsById[workoutId], "Workout", workoutId, currentOwnerId);
          if (current.status !== "planned") throw new Error("Only planned workout can be cancelled");
          if (hasActiveSession(currentState, currentOwnerId, workoutId)) throw new Error("Workout has active session");

          if (dataApi) {
            const remoteSession = await dataApi.cancelWorkoutSession(workoutId);
            await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
            return cloneWorkout(mapRemoteWorkout(remoteSession, currentOwnerId));
          }

          const workout = cloneWorkout({
            ...current,
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
            cancellationReason: optionalTrim(input.reason),
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        }
      },
      sessions: {
        async list() {
          const currentState = stateRef.current;
          return currentState.sessionIds
            .map((id) => currentState.sessionsById[id])
            .filter((session) => isOwned(session, currentOwnerId))
            .map(cloneSession);
        },
        async listCompletedByClient(clientId) {
          return selectCompletedSessionsByClient(stateRef.current, clientId, currentOwnerId);
        },
        async getById(sessionId) {
          const session = stateRef.current.sessionsById[sessionId];
          return isOwned(session, currentOwnerId) ? cloneSession(session) : null;
        },
        async start(workoutId) {
          const currentState = stateRef.current;
          const workout = ensureOwned(currentState.workoutsById[workoutId], "Workout", workoutId, currentOwnerId);
          if (workout.status === "cancelled") throw new Error("Cancelled workout cannot be started");

          const existingWorkoutSession = selectActiveSessionForWorkout(currentState, currentOwnerId, workoutId);
          if (existingWorkoutSession) return existingWorkoutSession;

          const conflictingSession = selectActiveSessionConflict(currentState, currentOwnerId, workoutId);
          if (conflictingSession) throw new ActiveSessionConflictError(conflictingSession);

          if (dataApi) {
            const remoteSession = await dataApi.startWorkoutSession(workoutId);
            const localSession = mapRemoteSession(remoteSession, currentOwnerId);
            if (!localSession) throw new DataError("unknown", "Не удалось начать тренировку", { retryable: true });
            await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
            return cloneSession(localSession);
          }

          const now = new Date().toISOString();
          const sessionExercises = workout.exercises.map((exercise, index) => ({
            id: createId("session-exercise"),
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            exerciseNameSnapshot: exercise.exerciseName,
            resultTypeSnapshot: exercise.resultType ?? defaultResultType,
            order: index + 1,
            comment: exercise.comment,
            plannedSets: exercise.sets.length,
            plannedRepetitions: exercise.sets[0]?.targetReps,
            plannedWeight: exercise.sets[0]?.targetWeightKg
          }));
          const session = {
            id: createId("session"),
            ownerId: currentOwnerId,
            workoutId,
            clientId: workout.clientId,
            status: "active" as const,
            startedAt: now,
            startedTimezone: normalizeTimezone(workout.timezone),
            workoutTitleSnapshot: workout.title,
            createdAt: now,
            updatedAt: now,
            exercises: sessionExercises
          };
          const resultActions: LocalDataAction[] = workout.exercises.flatMap((exercise, exerciseIndex) =>
            exercise.sets.map((set) => ({
              type: "result/upsert" as const,
              result: buildWorkoutResultFromSet({
                id: createId("result"),
                ownerId: currentOwnerId,
                sessionId: session.id,
                sessionExerciseItemId: sessionExercises[exerciseIndex]?.id,
                exercise,
                set
              })
            }))
          );
          await commitActions(
            [
              { type: "session/upsert", session },
              ...resultActions
            ],
            "immediate"
          );
          return cloneSession(session);
        },
        async addExercise(sessionId: SessionId, exerciseId: ExerciseId) {
          const currentState = stateRef.current;
          const current = ensureOwned(currentState.sessionsById[sessionId], "Session", sessionId, currentOwnerId);
          if (!isAvailableExercise(currentState.exercisesById[exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", exerciseId);
          if (current.exercises.some((exercise) => exercise.exerciseId === exerciseId)) return cloneSession(current);

          if (dataApi) {
            const remoteSession = await dataApi.updateWorkoutSession(sessionId, {
              items: [
                ...sessionExercisesToRemoteItems(current.exercises),
                {
                  exerciseId,
                  order: current.exercises.length + 1,
                  titleSnapshot: getExerciseName(currentState, exerciseId, currentOwnerId),
                  plannedSets: null,
                  plannedReps: null,
                  plannedWeight: null,
                  notes: null
                }
              ]
            });
            const localSession = mapRemoteSession(remoteSession, currentOwnerId);
            if (!localSession) throw new DataError("unknown", "Не удалось добавить упражнение", { retryable: true });
            await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
            return cloneSession(localSession);
          }

          const session = cloneSession({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: [
              ...current.exercises,
              {
                id: createId("session-exercise"),
                exerciseId,
                exerciseName: getExerciseName(currentState, exerciseId, currentOwnerId),
                exerciseNameSnapshot: getExerciseName(currentState, exerciseId, currentOwnerId),
                resultTypeSnapshot: getExerciseResultType(currentState, exerciseId, currentOwnerId) ?? defaultResultType,
                order: current.exercises.length + 1
              }
            ]
          });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async removeExercise(sessionId, exerciseId) {
          const current = ensureOwned(stateRef.current.sessionsById[sessionId], "Session", sessionId, currentOwnerId);

          if (dataApi) {
            const remoteSession = await dataApi.updateWorkoutSession(sessionId, {
              items: sessionExercisesToRemoteItems(
                current.exercises
                  .filter((exercise) => exercise.exerciseId !== exerciseId)
                  .map((exercise, index) => ({ ...exercise, order: index + 1 }))
              )
            });
            const localSession = mapRemoteSession(remoteSession, currentOwnerId);
            if (!localSession) throw new DataError("unknown", "Не удалось удалить упражнение", { retryable: true });
            await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
            return cloneSession(localSession);
          }

          const session = cloneSession({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: current.exercises.filter((exercise) => exercise.exerciseId !== exerciseId)
          });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async update(sessionId, patch: UpdateSessionInput) {
          if (dataApi && patch.exercises) {
            return sessionWriteQueueRef.current.enqueue(sessionId, async () => {
              ensureOwned(stateRef.current.sessionsById[sessionId], "Session", sessionId, currentOwnerId);
              const remoteSession = await dataApi.updateWorkoutSession(sessionId, {
                items: sessionExercisesToRemoteItems(patch.exercises ?? [])
              });
              const localSession = mapRemoteSession(remoteSession, currentOwnerId);
              if (!localSession) throw new DataError("unknown", "Не удалось сохранить тренировку", { retryable: true });
              await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
              return cloneSession(localSession);
            });
          }

          const current = ensureOwned(stateRef.current.sessionsById[sessionId], "Session", sessionId, currentOwnerId);
          const session = cloneSession({ ...current, ...patch, updatedAt: new Date().toISOString() });
          await commitActions([{ type: "session/upsert", session }]);
          return cloneSession(session);
        },
        async complete(sessionId) {
          const currentState = stateRef.current;
          const current = ensureOwned(currentState.sessionsById[sessionId], "Session", sessionId, currentOwnerId);
          if (current.status === "completed") return cloneSession(current);
          if (current.status !== "active") throw new Error("Only active session can be completed");

          if (dataApi) {
            const remoteSession = await dataApi.completeWorkoutSession(sessionId);
            const localSession = mapRemoteSession(remoteSession, currentOwnerId);
            if (!localSession) throw new DataError("unknown", "Не удалось завершить тренировку", { retryable: true });
            await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
            return cloneSession(localSession);
          }

          const durationSeconds = Math.max(0, Math.floor((Date.now() - new Date(current.startedAt).getTime()) / 1000));
          const completedAt = new Date().toISOString();
          const workout = currentState.workoutsById[current.workoutId];
          const completedTimezone = current.completedTimezone ?? current.startedTimezone ?? (isOwned(workout, currentOwnerId) ? workout.timezone : undefined);
          const session = cloneSession({ ...current, status: "completed", completedAt, completedTimezone: normalizeTimezone(completedTimezone), durationSeconds, updatedAt: completedAt });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async getPreviousExercisePerformance(input) {
          return selectPreviousExercisePerformance(stateRef.current, { ...input, ownerId: currentOwnerId });
        }
      },
      results: {
        async listBySession(sessionId) {
          const currentState = stateRef.current;
          const session = currentState.sessionsById[sessionId];
          if (!isOwned(session, currentOwnerId)) return [];
          return currentState.resultIds
            .map((id) => currentState.resultsById[id])
            .filter((result) => result.ownerId === currentOwnerId && result.sessionId === sessionId)
            .map(cloneResult);
        },
        async upsertSetResult(input: UpsertWorkoutResultInput) {
          if (dataApi) {
            return sessionWriteQueueRef.current.enqueue(input.sessionId, async () => {
              const currentState = stateRef.current;
              if (!isOwned(currentState.sessionsById[input.sessionId], currentOwnerId)) throw new DataNotFoundError("Session", input.sessionId);
              if (!isOwned(currentState.exercisesById[input.exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", input.exerciseId);
              const existing = currentState.resultIds
                .map((id) => currentState.resultsById[id])
                .find((result) => {
                  if (result.ownerId !== currentOwnerId || result.sessionId !== input.sessionId || result.setIndex !== input.setIndex) return false;
                  if (input.sessionExerciseItemId || result.sessionExerciseItemId) return result.sessionExerciseItemId === input.sessionExerciseItemId;
                  return result.exerciseId === input.exerciseId;
                });
              const resultId = existing?.id ?? createId("result");
              const remoteSession = await dataApi.upsertWorkoutSessionResults(input.sessionId, toRemoteResultsInput(currentState, currentOwnerId, input, resultId));
              const remoteResults = mapRemoteResults(remoteSession, currentOwnerId);
              await commitActions(remoteSessionActions(remoteSession, currentOwnerId), "immediate");
              const result = remoteResults.find((item) => item.id === resultId) ?? remoteResults.find((item) => item.setIndex === input.setIndex && item.sessionExerciseItemId === input.sessionExerciseItemId);
              if (!result) throw new DataError("unknown", "Не удалось сохранить результат подхода", { retryable: true });
              return cloneResult(result);
            });
          }

          const currentState = stateRef.current;
          if (!isOwned(currentState.sessionsById[input.sessionId], currentOwnerId)) throw new DataNotFoundError("Session", input.sessionId);
          if (!isOwned(currentState.exercisesById[input.exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", input.exerciseId);
          const existing = currentState.resultIds
            .map((id) => currentState.resultsById[id])
            .find((result) => {
              if (result.ownerId !== currentOwnerId || result.sessionId !== input.sessionId || result.setIndex !== input.setIndex) return false;
              if (input.sessionExerciseItemId || result.sessionExerciseItemId) return result.sessionExerciseItemId === input.sessionExerciseItemId;
              return result.exerciseId === input.exerciseId;
            });
          const resultId = existing?.id ?? createId("result");
          const result = buildWorkoutResultFromUpsertInput({
            id: resultId,
            ownerId: currentOwnerId,
            upsert: input,
            existing
          });
          await commitActions([{ type: "result/upsert", result }], result.completed ? "immediate" : "debounced");
          return cloneResult(result);
        },
        async remove(resultId) {
          const initial = stateRef.current.resultsById[resultId];
          if (!isOwned(initial, currentOwnerId)) throw new DataNotFoundError("Result", resultId);

          const removeAndReindex = (currentState: LocalDataState, target: WorkoutResult) => {
            const isSameScope = (result: WorkoutResult) =>
              result.ownerId === currentOwnerId &&
              result.sessionId === target.sessionId &&
              (target.sessionExerciseItemId || result.sessionExerciseItemId
                ? result.sessionExerciseItemId === target.sessionExerciseItemId
                : result.exerciseId === target.exerciseId);
            const scopedResults = currentState.resultIds.map((id) => currentState.resultsById[id]).filter(isSameScope);
            const remainingResults = scopedResults
              .filter((result) => result.id !== resultId)
              .sort((left, right) => left.setIndex - right.setIndex)
              .map((result, index) => ({ ...result, setIndex: index + 1 }));
            const actions: LocalDataAction[] = [
              ...scopedResults.map((result) => ({ type: "result/remove" as const, resultId: result.id })),
              ...remainingResults.map((result) => ({ type: "result/upsert" as const, result }))
            ];
            return { scopedResults, remainingResults, actions };
          };

          if (dataApi) {
            await sessionWriteQueueRef.current.enqueue(initial.sessionId, async () => {
              const currentState = stateRef.current;
              const target = currentState.resultsById[resultId];
              if (!isOwned(target, currentOwnerId)) return;
              const { scopedResults, remainingResults } = removeAndReindex(currentState, target);
              const session = ensureOwned(currentState.sessionsById[target.sessionId], "Session", target.sessionId, currentOwnerId);
              const itemId = target.sessionExerciseItemId ?? session.exercises.find((exercise) => exercise.exerciseId === target.exerciseId)?.id;
              if (!itemId) throw new DataError("validation", "Не удалось определить упражнение для удаления подхода", { retryable: false });
              const remoteSession = await dataApi.upsertWorkoutSessionResults(target.sessionId, {
                items: [{ id: itemId, setResults: remainingResults.map(toRemoteSetResult) }]
              });
              const remoteActions = remoteSessionActions(remoteSession, currentOwnerId);
              await commitActions([
                ...scopedResults.map((result) => ({ type: "result/remove" as const, resultId: result.id })),
                ...remoteActions
              ], "immediate");
            });
            return;
          }

          const { actions } = removeAndReindex(stateRef.current, initial);
          await commitActions(actions, "immediate");
        }
      },
      quickValues: {
        async getForExercise(input) {
          const currentState = stateRef.current;
          if (!isOwned(currentState.exercisesById[input.exerciseId], currentOwnerId)) return null;
          if (input.clientId && !isOwned(currentState.clientsById[input.clientId], currentOwnerId)) return null;
          const quickValue = stateRef.current.quickValueIds
            .map((id) => stateRef.current.quickValuesById[id])
            .find((item) => item.ownerId === currentOwnerId && item.exerciseId === input.exerciseId && item.metric === input.metric && item.clientId === input.clientId);
          return quickValue ? cloneQuickValue(quickValue) : null;
        },
        async upsert(input) {
          const currentState = stateRef.current;
          if (!isOwned(currentState.exercisesById[input.exerciseId], currentOwnerId)) throw new DataNotFoundError("Exercise", input.exerciseId);
          if (input.clientId && !isOwned(currentState.clientsById[input.clientId], currentOwnerId)) throw new DataNotFoundError("Client", input.clientId);

          const quickValue: QuickValue = {
            id: getQuickValueId(currentOwnerId, input.exerciseId, input.metric, input.clientId),
            ownerId: currentOwnerId,
            exerciseId: input.exerciseId,
            clientId: input.clientId,
            metric: input.metric,
            values: normalizeQuickValues(input.values),
            updatedAt: new Date().toISOString()
          };
          await commitActions([{ type: "quickValue/upsert", quickValue }], "immediate");
          return cloneQuickValue(quickValue);
        },
        async remove(id) {
          if (!isOwned(stateRef.current.quickValuesById[id], currentOwnerId)) throw new DataNotFoundError("QuickValue", id);
          await commitActions([{ type: "quickValue/remove", quickValueId: id }], "immediate");
        }
      }
    };
  }, [commitActions, currentOwnerId, dataApi]);

  const retryHydration = useCallback(() => {
    void hydrateLocalData();
  }, [hydrateLocalData]);

  const value = useMemo(
    () => ({
      state,
      data,
      currentOwnerId,
      hydrationStatus,
      hydrationError,
      persistenceStatus,
      retryHydration,
      sessionTimerPersistence,
      prepareAccountDeletion,
      clearAccountData,
      rollbackAccountDeletion
    }),
    [
      clearAccountData,
      currentOwnerId,
      data,
      hydrationError,
      hydrationStatus,
      persistenceStatus,
      prepareAccountDeletion,
      retryHydration,
      rollbackAccountDeletion,
      sessionTimerPersistence,
      state
    ]
  );

  if (hydrationStatus === "idle" || hydrationStatus === "loading") {
    return (
      <DataContext.Provider value={value}>
        <AppSplashScreen />
      </DataContext.Provider>
    );
  }

  if (hydrationStatus === "error") {
    return (
      <DataContext.Provider value={value}>
        <View style={styles.statusScreen}>
          <Text style={styles.statusTitle}>Локальные данные не удалось восстановить</Text>
          <Text style={styles.statusCopy}>Можно попробовать снова или сбросить локальные данные.</Text>
          <View style={styles.statusActions}>
            <Button label="Повторить" type="primary" size="large" width="fill" onPress={retryHydration} />
            <Button label="Сбросить локальные данные" type="secondaryNeutral" size="large" width="fill" onPress={() => void resetLocalData()} />
          </View>
          {__DEV__ && hydrationError ? <Text style={styles.devError}>{hydrationError.message}</Text> : null}
        </View>
      </DataContext.Provider>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("DataProvider is missing");
  }
  return context;
}

const styles = StyleSheet.create({
  statusScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  statusTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.inkDeep,
    textAlign: "center"
  },
  statusCopy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  },
  statusActions: {
    alignSelf: "stretch",
    gap: theme.spacing.sm
  },
  devError: {
    ...theme.typography.body.sm,
    color: theme.colors.status.negative,
    textAlign: "center"
  }
});
