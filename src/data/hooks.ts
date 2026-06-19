import { useMemo } from "react";
import { useDataContext } from "./DataProvider";
import { selectClientById, selectClients, selectExerciseById, selectExercises, selectQuickValue, selectResultsBySession, selectSessionById, selectSessions, selectWorkoutById, selectWorkouts } from "./local/localSelectors";
import type { ClientId, ExerciseId, QuickValueMetric, SessionId, WorkoutId } from "./types";

export function useDataLayer() {
  return useDataContext().data;
}

export function useClients() {
  const { state } = useDataContext();
  const clients = useMemo(() => selectClients(state), [state]);
  return { clients, isLoading: false, error: null as Error | null };
}

export function useClient(clientId?: ClientId) {
  const { state } = useDataContext();
  const client = useMemo(() => selectClientById(state, clientId), [clientId, state]);
  return { client, isLoading: false, error: null as Error | null, notFound: Boolean(clientId && !client) };
}

export function useClientActions() {
  return useDataContext().data.clients;
}

export function useExercises() {
  const { state } = useDataContext();
  const exercises = useMemo(() => selectExercises(state), [state]);
  return { exercises, isLoading: false, error: null as Error | null };
}

export function useExercise(exerciseId?: ExerciseId) {
  const { state } = useDataContext();
  const exercise = useMemo(() => selectExerciseById(state, exerciseId), [exerciseId, state]);
  return { exercise, isLoading: false, error: null as Error | null, notFound: Boolean(exerciseId && !exercise) };
}

export function useWorkouts() {
  const { state } = useDataContext();
  const workouts = useMemo(() => selectWorkouts(state), [state]);
  return { workouts, isLoading: false, error: null as Error | null };
}

export function useWorkout(workoutId?: WorkoutId) {
  const { state } = useDataContext();
  const workout = useMemo(() => selectWorkoutById(state, workoutId), [state, workoutId]);
  return { workout, isLoading: false, error: null as Error | null, notFound: Boolean(workoutId && !workout) };
}

export function useWorkoutDraft(draftId?: WorkoutId) {
  const result = useWorkout(draftId);
  const workout = result.workout?.status === "draft" ? result.workout : null;
  return { ...result, workout, draft: workout, notFound: Boolean(draftId && !workout) };
}

export function useWorkoutActions() {
  return useDataContext().data.workouts;
}

export function useSessions() {
  const { state } = useDataContext();
  const sessions = useMemo(() => selectSessions(state), [state]);
  return { sessions, isLoading: false, error: null as Error | null };
}

export function useSession(sessionId?: SessionId) {
  const { state } = useDataContext();
  const session = useMemo(() => selectSessionById(state, sessionId), [sessionId, state]);
  return { session, isLoading: false, error: null as Error | null, notFound: Boolean(sessionId && !session) };
}

export function useSessionActions() {
  return useDataContext().data.sessions;
}

export function useSessionResults(sessionId?: SessionId) {
  const { state } = useDataContext();
  const results = useMemo(() => selectResultsBySession(state, sessionId), [sessionId, state]);
  return { results, isLoading: false, error: null as Error | null };
}

export function useResults() {
  const { state } = useDataContext();
  const results = useMemo(() => state.resultIds.map((id) => ({ ...state.resultsById[id] })), [state]);
  return { results, isLoading: false, error: null as Error | null };
}

export function useResultActions() {
  return useDataContext().data.results;
}

export function useQuickValue(exerciseId?: ExerciseId, metric?: QuickValueMetric, clientId?: ClientId) {
  const { state } = useDataContext();
  const quickValue = useMemo(() => selectQuickValue(state, { exerciseId, metric, clientId }), [clientId, exerciseId, metric, state]);
  return { quickValue, isLoading: false, error: null as Error | null };
}

export function useQuickValueActions() {
  return useDataContext().data.quickValues;
}
