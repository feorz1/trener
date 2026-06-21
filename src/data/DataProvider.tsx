import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import type { DataLayer } from "./contracts";
import { ActiveSessionConflictError, DataError, DataNotFoundError } from "./contracts";
import { createId } from "./createId";
import { LOCAL_OWNER_ID } from "./types";
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
  WorkoutResultType
} from "./types";
import { localReducer, type LocalDataAction } from "./local/localReducer";
import type { LocalDataState } from "./local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "./local/localState";
import { assertUniqueActiveExerciseName, normalizeExercisePatch } from "./local/exerciseValidation";
import { buildWorkoutResultFromSet, buildWorkoutResultFromUpsertInput } from "./local/resultBuilders";
import { selectActiveSessionConflict, selectActiveSessionForWorkout, selectCompletedSessionsByClient, selectPreviousExercisePerformance } from "./local/localSelectors";
import { getAdjacentConnectionIds, getSupersetConnectionIds, preserveSupersetConnectionsAfterReorder, sortWorkoutExercisesByOrder, syncSupersetConnectionsForScope } from "./local/supersetConnections";
import { createInitialState } from "./seeds/mockSeed";
import { CURRENT_SCHEMA_VERSION, localPersistenceAdapter, migrateSnapshot, hydrateDataState, PersistenceCoordinator, type PersistenceAdapter, type PersistenceStatus } from "./persistence";
import { theme } from "@/theme";
import { Button, Loader } from "@/components/ui";

type HydrationStatus = "idle" | "loading" | "ready" | "error";
type SaveMode = "debounced" | "immediate";

type DataContextValue = {
  state: LocalDataState;
  data: DataLayer;
  currentOwnerId: OwnerId;
  hydrationStatus: HydrationStatus;
  hydrationError: Error | null;
  persistenceStatus: PersistenceStatus;
  retryHydration: () => void;
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

function optionalTrimList(values?: string[]) {
  const trimmed = values?.map((value) => value.trim()).filter(Boolean);
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
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

function createWorkoutExercise(state: LocalDataState, ownerId: OwnerId, exerciseId: ExerciseId, order: number, day?: RepeatDay, existingId?: string) {
  if (!isAvailableExercise(state.exercisesById[exerciseId], ownerId)) {
    throw new DataNotFoundError("Exercise", exerciseId);
  }

  return {
    id: existingId ?? createId("workout-exercise"),
    exerciseId,
    exerciseName: getExerciseName(state, exerciseId, ownerId),
    day,
    sets: [
      {
        id: createId("set"),
        order: 1,
        targetWeightKg: 150,
        targetReps: 12,
        completed: false
      }
    ],
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

export function DataProvider({ children, persistenceAdapter = localPersistenceAdapter }: { children: ReactNode; persistenceAdapter?: PersistenceAdapter }) {
  const currentOwnerId = LOCAL_OWNER_ID;
  const [state, dispatch] = useReducer(localReducer, undefined, createInitialState);
  const stateRef = useRef(state);
  const coordinatorRef = useRef(new PersistenceCoordinator(persistenceAdapter));
  const [hydrationStatus, setHydrationStatus] = useState<HydrationStatus>("idle");
  const hydrationStatusRef = useRef<HydrationStatus>("idle");
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>("idle");
  const [hydrationError, setHydrationError] = useState<Error | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    coordinatorRef.current = new PersistenceCoordinator(persistenceAdapter);
  }, [persistenceAdapter]);

  const updateHydrationStatus = useCallback((status: HydrationStatus) => {
    hydrationStatusRef.current = status;
    setHydrationStatus(status);
  }, []);

  const hydrateLocalData = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      updateHydrationStatus("loading");
      setHydrationError(null);

      try {
        const rawSnapshot = await persistenceAdapter.load();
        const snapshot = rawSnapshot ? migrateSnapshot(rawSnapshot) : null;
        const nextState = snapshot ? hydrateDataState(snapshot) : createInitialState();
        const shouldWriteCurrentSnapshot = !rawSnapshot || getSnapshotSchemaVersion(rawSnapshot) !== CURRENT_SCHEMA_VERSION;

        if (isCancelled()) return;

        stateRef.current = nextState;
        dispatch({ type: "state/replace", state: nextState });

        if (shouldWriteCurrentSnapshot) {
          await coordinatorRef.current.saveImmediately(nextState);
        }

        if (isCancelled()) return;

        updateHydrationStatus("ready");
        setPersistenceStatus(coordinatorRef.current.getStatus());
      } catch (error) {
        if (__DEV__) {
          console.warn("Local data hydration failed", error);
        }
        if (isCancelled()) return;
        setHydrationError(error instanceof Error ? error : new Error("Local data hydration failed"));
        updateHydrationStatus("error");
        setPersistenceStatus(coordinatorRef.current.getStatus());
      }
    },
    [persistenceAdapter, updateHydrationStatus]
  );

  const commitActions = useCallback(async (actions: LocalDataAction[], mode: SaveMode = "debounced") => {
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
    const nextState = createInitialState();

    await persistenceAdapter.clear();
    stateRef.current = nextState;
    dispatch({ type: "state/replace", state: nextState });
    await coordinatorRef.current.saveImmediately(nextState);
    setHydrationError(null);
    updateHydrationStatus("ready");
    setPersistenceStatus(coordinatorRef.current.getStatus());
  }, [persistenceAdapter, updateHydrationStatus]);

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
            restrictions: optionalTrimList(input.restrictions),
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
            restrictions: patch.restrictions !== undefined ? optionalTrimList(patch.restrictions) : current.restrictions,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString(),
            metrics: patch.metrics ? { ...current.metrics, ...patch.metrics } : current.metrics
          };
          await commitActions([{ type: "client/upsert", client }], "immediate");
          return cloneClient(client);
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
          if (existingDraft) return cloneWorkout(existingDraft);

          const now = new Date().toISOString();
          const draft = cloneWorkout({
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
          });
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
                order: current.exercises.length + 1
              }
            ]
          });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async removeExercise(sessionId, exerciseId) {
          const current = ensureOwned(stateRef.current.sessionsById[sessionId], "Session", sessionId, currentOwnerId);
          const session = cloneSession({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: current.exercises.filter((exercise) => exercise.exerciseId !== exerciseId)
          });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async update(sessionId, patch: UpdateSessionInput) {
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
          const result = buildWorkoutResultFromUpsertInput({
            id: existing?.id ?? createId("result"),
            ownerId: currentOwnerId,
            upsert: input,
            existing
          });
          await commitActions([{ type: "result/upsert", result }], result.completed ? "immediate" : "debounced");
          return cloneResult(result);
        },
        async remove(resultId) {
          if (!isOwned(stateRef.current.resultsById[resultId], currentOwnerId)) throw new DataNotFoundError("Result", resultId);
          await commitActions([{ type: "result/remove", resultId }], "immediate");
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
  }, [commitActions, currentOwnerId]);

  const retryHydration = useCallback(() => {
    void hydrateLocalData();
  }, [hydrateLocalData]);

  const value = useMemo(
    () => ({ state, data, currentOwnerId, hydrationStatus, hydrationError, persistenceStatus, retryHydration }),
    [currentOwnerId, data, hydrationError, hydrationStatus, persistenceStatus, retryHydration, state]
  );

  if (hydrationStatus === "idle" || hydrationStatus === "loading") {
    return (
      <DataContext.Provider value={value}>
        <View style={styles.statusScreen}>
          <Loader size="medium" tone="brand" />
          <Text style={styles.statusTitle}>Загружаем данные</Text>
        </View>
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
    color: theme.colors.content.primary,
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
