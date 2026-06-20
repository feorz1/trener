import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import type { DataLayer } from "./contracts";
import { DataNotFoundError } from "./contracts";
import { createId } from "./createId";
import type {
  CreateClientInput,
  CreateExerciseInput,
  CreateWorkoutDraftInput,
  ExerciseId,
  QuickValue,
  QuickValueMetric,
  RepeatDay,
  RescheduleWorkoutInput,
  SessionId,
  UpdateClientInput,
  UpdateSessionInput,
  UpdateWorkoutDraftInput,
  UpsertWorkoutResultInput,
  Workout
} from "./types";
import { localReducer, type LocalDataAction } from "./local/localReducer";
import type { LocalDataState } from "./local/localState";
import { cloneClient, cloneExercise, cloneQuickValue, cloneResult, cloneSession, cloneWorkout } from "./local/localState";
import { selectCompletedSessionsByClient, selectPreviousExercisePerformance } from "./local/localSelectors";
import { getAdjacentConnectionIds, getSupersetConnectionIds, preserveSupersetConnectionsAfterReorder, sortWorkoutExercisesByOrder, syncSupersetConnectionsForScope } from "./local/supersetConnections";
import { createInitialState } from "./seeds/mockSeed";
import { localPersistenceAdapter, migrateSnapshot, hydrateDataState, PersistenceCoordinator, type PersistenceAdapter, type PersistenceStatus } from "./persistence";
import { theme } from "@/theme";

type HydrationStatus = "idle" | "loading" | "ready" | "error";
type SaveMode = "debounced" | "immediate";

type DataContextValue = {
  state: LocalDataState;
  data: DataLayer;
  hydrationStatus: HydrationStatus;
  persistenceStatus: PersistenceStatus;
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

function ensureWorkoutDraft(workout: Workout | undefined, id: string) {
  if (!workout || workout.status !== "draft") {
    throw new DataNotFoundError("Workout draft", id);
  }
  return workout;
}

function getSessionsForWorkout(state: LocalDataState, workoutId: string) {
  return state.sessionIds.map((id) => state.sessionsById[id]).filter((session) => session.workoutId === workoutId);
}

function hasActiveSession(state: LocalDataState, workoutId: string) {
  return getSessionsForWorkout(state, workoutId).some((session) => session.status === "active");
}

function hasCompletedSession(state: LocalDataState, workoutId: string) {
  return getSessionsForWorkout(state, workoutId).some((session) => session.status === "completed");
}

function ensureWorkoutCanChangePlan(state: LocalDataState, workout: Workout) {
  if (workout.status === "cancelled") throw new Error("Workout is cancelled");
  if (hasActiveSession(state, workout.id)) throw new Error("Workout has active session");
  if (hasCompletedSession(state, workout.id)) throw new Error("Workout has completed session");
}

function getExerciseName(state: LocalDataState, exerciseId: ExerciseId) {
  return state.exercisesById[exerciseId]?.name ?? "Упражнение";
}

function createWorkoutExercise(state: LocalDataState, exerciseId: ExerciseId, order: number, day?: RepeatDay, existingId?: string) {
  if (!state.exercisesById[exerciseId]) {
    throw new DataNotFoundError("Exercise", exerciseId);
  }

  return {
    id: existingId ?? createId("workout-exercise"),
    exerciseId,
    exerciseName: getExerciseName(state, exerciseId),
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

function getQuickValueId(exerciseId: ExerciseId, metric: QuickValueMetric, clientId?: string) {
  return `quick-value:${clientId ?? "global"}:${exerciseId}:${metric}`;
}

function normalizeQuickValues(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value)))).slice(0, 5);
}

export function DataProvider({ children, persistenceAdapter = localPersistenceAdapter }: { children: ReactNode; persistenceAdapter?: PersistenceAdapter }) {
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

    async function hydrate() {
      updateHydrationStatus("loading");
      setHydrationError(null);

      try {
        const rawSnapshot = await persistenceAdapter.load();
        const nextState = rawSnapshot ? hydrateDataState(migrateSnapshot(rawSnapshot)) : createInitialState();

        if (cancelled) return;

        stateRef.current = nextState;
        dispatch({ type: "state/replace", state: nextState });

        if (!rawSnapshot) {
          await coordinatorRef.current.saveImmediately(nextState);
        }

        if (cancelled) return;

        updateHydrationStatus("ready");
        setPersistenceStatus(coordinatorRef.current.getStatus());
      } catch (error) {
        if (__DEV__) {
          console.warn("Local data hydration failed", error);
        }
        if (cancelled) return;
        setHydrationError(error instanceof Error ? error : new Error("Local data hydration failed"));
        updateHydrationStatus("error");
        setPersistenceStatus(coordinatorRef.current.getStatus());
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
      coordinatorRef.current.cancelPending();
    };
  }, [persistenceAdapter, updateHydrationStatus]);

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
          return currentState.clientIds.map((id) => cloneClient(currentState.clientsById[id]));
        },
        async getById(id) {
          const currentState = stateRef.current;
          return currentState.clientsById[id] ? cloneClient(currentState.clientsById[id]) : null;
        },
        async create(input: CreateClientInput) {
          const now = new Date().toISOString();
          const name = requiredTrim(input.name, "Новый клиент");
          const client = {
            id: createId("client"),
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
          const current = currentState.clientsById[id];
          if (!current) throw new DataNotFoundError("Client", id);

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
            .map((id) => cloneExercise(currentState.exercisesById[id]))
            .filter((exercise) => !exercise.archivedAt);
        },
        async getById(id) {
          const exercise = stateRef.current.exercisesById[id];
          return exercise ? cloneExercise(exercise) : null;
        },
        async create(input: CreateExerciseInput) {
          const now = new Date().toISOString();
          const exercise = {
            id: createId("exercise"),
            name: requiredTrim(input.name, "Новое упражнение"),
            category: input.category ?? "strength",
            source: "custom" as const,
            primaryMuscles: input.primaryMuscles.length > 0 ? input.primaryMuscles : ["all"],
            secondaryMuscles: input.secondaryMuscles,
            equipment: optionalTrim(input.equipment) ?? "Не указано",
            coachNotes: optionalTrim(input.coachNotes),
            notes: optionalTrim(input.notes),
            createdAt: now,
            updatedAt: now
          };
          await commitActions([{ type: "exercise/upsert", exercise }], "immediate");
          return cloneExercise(exercise);
        },
        async archive(id) {
          const current = stateRef.current.exercisesById[id];
          if (!current) throw new DataNotFoundError("Exercise", id);
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
          return currentState.workoutIds.map((id) => cloneWorkout(currentState.workoutsById[id]));
        },
        async getById(id) {
          const workout = stateRef.current.workoutsById[id];
          return workout ? cloneWorkout(workout) : null;
        },
        async createDraft(input: CreateWorkoutDraftInput = {}) {
          const currentState = stateRef.current;
          if (input.clientId && !currentState.clientsById[input.clientId]) {
            throw new DataNotFoundError("Client", input.clientId);
          }

          const now = new Date().toISOString();
          const workout: Workout = {
            id: createId("workout"),
            clientId: input.clientId,
            title: input.title ?? "Новая тренировка",
            startsAt: input.startsAt ?? new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
          const current = ensureWorkoutDraft(currentState.workoutsById[draftId], draftId);
          if (patch.clientId && !currentState.clientsById[patch.clientId]) {
            throw new DataNotFoundError("Client", patch.clientId);
          }

          const workout = cloneWorkout({
            ...current,
            ...patch,
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
          const current = ensureWorkoutDraft(currentState.workoutsById[draftId], draftId);
          if (!currentState.clientsById[clientId]) throw new DataNotFoundError("Client", clientId);

          const workout = cloneWorkout({ ...current, clientId, updatedAt: new Date().toISOString() });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async setDraftExercises(draftId, exerciseIds, options = {}) {
          const currentState = stateRef.current;
          const current = ensureWorkoutDraft(currentState.workoutsById[draftId], draftId);
          exerciseIds.forEach((exerciseId) => {
            if (!currentState.exercisesById[exerciseId]) throw new DataNotFoundError("Exercise", exerciseId);
          });

          const scopedExercises = current.exercises.filter((exercise) => exercise.day === options.day);
          const scopedConnectionIds = getSupersetConnectionIds(scopedExercises);
          const existingByExerciseId = Object.fromEntries(scopedExercises.map((exercise) => [exercise.exerciseId, exercise]));
          const nextScopedExercises = exerciseIds.map((exerciseId, index) => {
            const existing = existingByExerciseId[exerciseId];
            return existing ? { ...existing, order: index + 1, day: options.day } : createWorkoutExercise(currentState, exerciseId, index + 1, options.day);
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
          const current = ensureWorkoutDraft(stateRef.current.workoutsById[draftId], draftId);
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
          const current = ensureWorkoutDraft(stateRef.current.workoutsById[draftId], draftId);
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
          const current = ensureWorkoutDraft(stateRef.current.workoutsById[draftId], draftId);
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
          const current = ensureWorkoutDraft(currentState.workoutsById[draftId], draftId);
          if (!currentState.exercisesById[exerciseId]) throw new DataNotFoundError("Exercise", exerciseId);
          if (current.exercises.some((exercise) => exercise.exerciseId === exerciseId)) return cloneWorkout(current);

          const workout = cloneWorkout({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: [...current.exercises, createWorkoutExercise(currentState, exerciseId, current.exercises.length + 1)]
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async removeExercise(draftId, exerciseId) {
          const current = ensureWorkoutDraft(stateRef.current.workoutsById[draftId], draftId);
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
          const source = currentState.workoutsById[workoutId];
          if (!source) throw new DataNotFoundError("Workout", workoutId);
          ensureWorkoutCanChangePlan(currentState, source);

          const existingDraft = currentState.workoutIds
            .map((id) => currentState.workoutsById[id])
            .find((workout) => workout.status === "draft" && workout.sourceWorkoutId === workoutId);
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
          const draft = ensureWorkoutDraft(currentState.workoutsById[draftId], draftId);
          const sourceWorkoutId = draft.sourceWorkoutId;
          if (!sourceWorkoutId) return this.publishDraft(draftId);

          const source = currentState.workoutsById[sourceWorkoutId];
          if (!source) throw new DataNotFoundError("Workout", sourceWorkoutId);
          ensureWorkoutCanChangePlan(currentState, source);

          const workout = cloneWorkout({
            ...source,
            clientId: draft.clientId,
            title: draft.title || source.title,
            startsAt: draft.startsAt,
            timezone: draft.timezone,
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
          const current = ensureWorkoutDraft(stateRef.current.workoutsById[draftId], draftId);
          if (current.sourceWorkoutId) return this.applyEditDraft(draftId);
          const workout = cloneWorkout({
            ...current,
            title: current.title || "Тренировка",
            status: "planned",
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async discardDraft(draftId) {
          ensureWorkoutDraft(stateRef.current.workoutsById[draftId], draftId);
          await commitActions([{ type: "workout/remove", workoutId: draftId }], "immediate");
        },
        async reschedule(workoutId, input: RescheduleWorkoutInput) {
          const currentState = stateRef.current;
          const current = currentState.workoutsById[workoutId];
          if (!current) throw new DataNotFoundError("Workout", workoutId);
          ensureWorkoutCanChangePlan(currentState, current);
          const startsAt = new Date(input.startsAt);
          if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid workout date");

          const workout = cloneWorkout({
            ...current,
            startsAt: startsAt.toISOString(),
            timezone: input.timezone ?? current.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
            updatedAt: new Date().toISOString()
          });
          await commitActions([{ type: "workout/upsert", workout }], "immediate");
          return cloneWorkout(workout);
        },
        async cancel(workoutId, input = {}) {
          const currentState = stateRef.current;
          const current = currentState.workoutsById[workoutId];
          if (!current) throw new DataNotFoundError("Workout", workoutId);
          if (current.status !== "planned") throw new Error("Only planned workout can be cancelled");
          if (hasActiveSession(currentState, workoutId)) throw new Error("Workout has active session");

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
          return currentState.sessionIds.map((id) => cloneSession(currentState.sessionsById[id]));
        },
        async listCompletedByClient(clientId) {
          return selectCompletedSessionsByClient(stateRef.current, clientId);
        },
        async getById(sessionId) {
          const session = stateRef.current.sessionsById[sessionId];
          return session ? cloneSession(session) : null;
        },
        async start(workoutId) {
          const currentState = stateRef.current;
          const workout = currentState.workoutsById[workoutId];
          if (!workout) throw new DataNotFoundError("Workout", workoutId);
          if (workout.status === "cancelled") throw new Error("Cancelled workout cannot be started");

          const existingSession = currentState.sessionIds.map((id) => currentState.sessionsById[id]).find((session) => session.workoutId === workoutId && session.status === "active");
          if (existingSession) return cloneSession(existingSession);

          const now = new Date().toISOString();
          const sessionExercises = workout.exercises.map((exercise, index) => ({
            id: createId("session-exercise"),
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            exerciseNameSnapshot: exercise.exerciseName,
            order: index + 1,
            comment: exercise.comment,
            plannedSets: exercise.sets.length,
            plannedRepetitions: exercise.sets[0]?.targetReps,
            plannedWeight: exercise.sets[0]?.targetWeightKg
          }));
          const session = {
            id: createId("session"),
            workoutId,
            clientId: workout.clientId,
            status: "active" as const,
            startedAt: now,
            workoutTitleSnapshot: workout.title,
            createdAt: now,
            updatedAt: now,
            exercises: sessionExercises
          };
          const resultActions: LocalDataAction[] = workout.exercises.flatMap((exercise, exerciseIndex) =>
            exercise.sets.map((set) => ({
              type: "result/upsert" as const,
              result: {
                id: createId("result"),
                sessionId: session.id,
                sessionExerciseItemId: sessionExercises[exerciseIndex]?.id,
                exerciseId: exercise.exerciseId,
                setIndex: set.order,
                setId: set.id,
                weight: set.actualWeightKg ?? set.targetWeightKg,
                repetitions: set.actualReps ?? set.targetReps,
                unit: "кг",
                completed: set.completed
              }
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
          const current = currentState.sessionsById[sessionId];
          if (!current) throw new DataNotFoundError("Session", sessionId);
          if (!currentState.exercisesById[exerciseId]) throw new DataNotFoundError("Exercise", exerciseId);
          if (current.exercises.some((exercise) => exercise.exerciseId === exerciseId)) return cloneSession(current);

          const session = cloneSession({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: [
              ...current.exercises,
              {
                id: createId("session-exercise"),
                exerciseId,
                exerciseName: getExerciseName(currentState, exerciseId),
                exerciseNameSnapshot: getExerciseName(currentState, exerciseId),
                order: current.exercises.length + 1
              }
            ]
          });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async removeExercise(sessionId, exerciseId) {
          const current = stateRef.current.sessionsById[sessionId];
          if (!current) throw new DataNotFoundError("Session", sessionId);
          const session = cloneSession({
            ...current,
            updatedAt: new Date().toISOString(),
            exercises: current.exercises.filter((exercise) => exercise.exerciseId !== exerciseId)
          });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async update(sessionId, patch: UpdateSessionInput) {
          const current = stateRef.current.sessionsById[sessionId];
          if (!current) throw new DataNotFoundError("Session", sessionId);
          const session = cloneSession({ ...current, ...patch, updatedAt: new Date().toISOString() });
          await commitActions([{ type: "session/upsert", session }]);
          return cloneSession(session);
        },
        async complete(sessionId) {
          const currentState = stateRef.current;
          const current = currentState.sessionsById[sessionId];
          if (!current) throw new DataNotFoundError("Session", sessionId);
          if (current.status === "completed") return cloneSession(current);
          if (current.status !== "active") throw new Error("Only active session can be completed");
          const durationSeconds = Math.max(0, Math.floor((Date.now() - new Date(current.startedAt).getTime()) / 1000));
          const completedAt = new Date().toISOString();
          const session = cloneSession({ ...current, status: "completed", completedAt, durationSeconds, updatedAt: completedAt });
          await commitActions([{ type: "session/upsert", session }], "immediate");
          return cloneSession(session);
        },
        async getPreviousExercisePerformance(input) {
          return selectPreviousExercisePerformance(stateRef.current, input);
        }
      },
      results: {
        async listBySession(sessionId) {
          const currentState = stateRef.current;
          return currentState.resultIds.filter((id) => currentState.resultsById[id].sessionId === sessionId).map((id) => cloneResult(currentState.resultsById[id]));
        },
        async upsertSetResult(input: UpsertWorkoutResultInput) {
          const currentState = stateRef.current;
          if (!currentState.sessionsById[input.sessionId]) throw new DataNotFoundError("Session", input.sessionId);
          if (!currentState.exercisesById[input.exerciseId]) throw new DataNotFoundError("Exercise", input.exerciseId);

          const existing = currentState.resultIds
            .map((id) => currentState.resultsById[id])
            .find((result) => {
              if (result.sessionId !== input.sessionId || result.setIndex !== input.setIndex) return false;
              if (input.sessionExerciseItemId || result.sessionExerciseItemId) return result.sessionExerciseItemId === input.sessionExerciseItemId;
              return result.exerciseId === input.exerciseId;
            });
          const result = {
            id: existing?.id ?? createId("result"),
            sessionId: input.sessionId,
            sessionExerciseItemId: input.sessionExerciseItemId ?? existing?.sessionExerciseItemId,
            exerciseId: input.exerciseId,
            setIndex: input.setIndex,
            setId: input.setId ?? existing?.setId,
            weight: input.weight,
            repetitions: input.repetitions,
            unit: input.unit ?? existing?.unit ?? "кг",
            completed: input.completed ?? existing?.completed ?? false
          };
          await commitActions([{ type: "result/upsert", result }], result.completed ? "immediate" : "debounced");
          return cloneResult(result);
        },
        async remove(resultId) {
          if (!stateRef.current.resultsById[resultId]) throw new DataNotFoundError("Result", resultId);
          await commitActions([{ type: "result/remove", resultId }], "immediate");
        }
      },
      quickValues: {
        async getForExercise(input) {
          const quickValue = stateRef.current.quickValueIds
            .map((id) => stateRef.current.quickValuesById[id])
            .find((item) => item.exerciseId === input.exerciseId && item.metric === input.metric && item.clientId === input.clientId);
          return quickValue ? cloneQuickValue(quickValue) : null;
        },
        async upsert(input) {
          const currentState = stateRef.current;
          if (!currentState.exercisesById[input.exerciseId]) throw new DataNotFoundError("Exercise", input.exerciseId);
          if (input.clientId && !currentState.clientsById[input.clientId]) throw new DataNotFoundError("Client", input.clientId);

          const quickValue: QuickValue = {
            id: getQuickValueId(input.exerciseId, input.metric, input.clientId),
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
          if (!stateRef.current.quickValuesById[id]) throw new DataNotFoundError("QuickValue", id);
          await commitActions([{ type: "quickValue/remove", quickValueId: id }], "immediate");
        }
      }
    };
  }, [commitActions]);

  const value = useMemo(() => ({ state, data, hydrationStatus, persistenceStatus }), [data, hydrationStatus, persistenceStatus, state]);

  if (hydrationStatus === "idle" || hydrationStatus === "loading") {
    return (
      <View style={styles.statusScreen}>
        <Text style={styles.statusTitle}>Загружаем данные</Text>
      </View>
    );
  }

  if (hydrationStatus === "error") {
    return (
      <View style={styles.statusScreen}>
        <Text style={styles.statusTitle}>Локальные данные не удалось восстановить</Text>
        <Text style={styles.statusCopy}>Можно попробовать перезапустить приложение или сбросить локальные данные.</Text>
        <Pressable accessibilityRole="button" style={styles.resetButton} onPress={() => void resetLocalData()}>
          <Text style={styles.resetButtonText}>Сбросить локальные данные</Text>
        </Pressable>
        {__DEV__ && hydrationError ? <Text style={styles.devError}>{hydrationError.message}</Text> : null}
      </View>
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
  resetButton: {
    minHeight: theme.sizes.buttonMdHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.content.primary
  },
  resetButtonText: {
    ...theme.typography.button.md,
    color: theme.colors.content.onPrimary
  },
  devError: {
    ...theme.typography.body.sm,
    color: theme.colors.status.negative,
    textAlign: "center"
  }
});
