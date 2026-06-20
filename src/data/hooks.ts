import { useMemo } from "react";
import { useDataContext } from "./DataProvider";
import {
  selectClientById,
  selectClients,
  selectCompletedSessionsByClient,
  selectExerciseById,
  selectExercises,
  selectPreviousExercisePerformance,
  selectQuickValue,
  selectResultsBySession,
  selectSessionById,
  selectSessions,
  selectWorkoutById,
  selectWorkouts
} from "./local/localSelectors";
import type { ClientId, ExerciseId, QuickValueMetric, SessionId, WorkoutId } from "./types";

export function useDataLayer() {
  return useDataContext().data;
}

export function useCurrentOwnerId() {
  return useDataContext().currentOwnerId;
}

export function useClients() {
  const { currentOwnerId, state } = useDataContext();
  const clients = useMemo(() => selectClients(state, currentOwnerId), [currentOwnerId, state]);
  return { clients, isLoading: false, error: null as Error | null };
}

export function useClient(clientId?: ClientId) {
  const { currentOwnerId, state } = useDataContext();
  const client = useMemo(() => selectClientById(state, clientId, currentOwnerId), [clientId, currentOwnerId, state]);
  return { client, isLoading: false, error: null as Error | null, notFound: Boolean(clientId && !client) };
}

export function useClientActions() {
  return useDataContext().data.clients;
}

export function useExercises() {
  const { currentOwnerId, state } = useDataContext();
  const exercises = useMemo(() => selectExercises(state, currentOwnerId), [currentOwnerId, state]);
  return { exercises, isLoading: false, error: null as Error | null };
}

export function useExercise(exerciseId?: ExerciseId) {
  const { currentOwnerId, state } = useDataContext();
  const exercise = useMemo(() => selectExerciseById(state, exerciseId, currentOwnerId), [currentOwnerId, exerciseId, state]);
  return { exercise, isLoading: false, error: null as Error | null, notFound: Boolean(exerciseId && !exercise) };
}

export function useExerciseActions() {
  return useDataContext().data.exercises;
}

export function useWorkouts() {
  const { currentOwnerId, state } = useDataContext();
  const workouts = useMemo(() => selectWorkouts(state, currentOwnerId), [currentOwnerId, state]);
  return { workouts, isLoading: false, error: null as Error | null };
}

export function useWorkout(workoutId?: WorkoutId) {
  const { currentOwnerId, state } = useDataContext();
  const workout = useMemo(() => selectWorkoutById(state, workoutId, currentOwnerId), [currentOwnerId, state, workoutId]);
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
  const { currentOwnerId, state } = useDataContext();
  const sessions = useMemo(() => selectSessions(state, currentOwnerId), [currentOwnerId, state]);
  return { sessions, isLoading: false, error: null as Error | null };
}

export function useSession(sessionId?: SessionId) {
  const { currentOwnerId, state } = useDataContext();
  const session = useMemo(() => selectSessionById(state, sessionId, currentOwnerId), [currentOwnerId, sessionId, state]);
  return { session, isLoading: false, error: null as Error | null, notFound: Boolean(sessionId && !session) };
}

export function useSessionActions() {
  return useDataContext().data.sessions;
}

export function useSessionResults(sessionId?: SessionId) {
  const { currentOwnerId, state } = useDataContext();
  const results = useMemo(() => selectResultsBySession(state, sessionId, currentOwnerId), [currentOwnerId, sessionId, state]);
  return { results, isLoading: false, error: null as Error | null };
}

export function useClientWorkoutHistory(clientId?: ClientId) {
  const { currentOwnerId, state } = useDataContext();
  const sessions = useMemo(() => selectCompletedSessionsByClient(state, clientId, currentOwnerId), [clientId, currentOwnerId, state]);
  return { sessions, isLoading: false, error: null as Error | null };
}

export function useResults() {
  const { currentOwnerId, state } = useDataContext();
  const results = useMemo(() => state.resultIds.map((id) => state.resultsById[id]).filter((result) => result.ownerId === currentOwnerId).map((result) => ({ ...result })), [currentOwnerId, state]);
  return { results, isLoading: false, error: null as Error | null };
}

export function useResultActions() {
  return useDataContext().data.results;
}

export function useQuickValue(exerciseId?: ExerciseId, metric?: QuickValueMetric, clientId?: ClientId) {
  const { currentOwnerId, state } = useDataContext();
  const quickValue = useMemo(() => selectQuickValue(state, { ownerId: currentOwnerId, exerciseId, metric, clientId }), [clientId, currentOwnerId, exerciseId, metric, state]);
  return { quickValue, isLoading: false, error: null as Error | null };
}

export function usePreviousExercisePerformance(input: { clientId?: ClientId; exerciseId?: ExerciseId; before?: string; excludeSessionId?: SessionId }) {
  const { currentOwnerId, state } = useDataContext();
  const previousPerformance = useMemo(() => selectPreviousExercisePerformance(state, { ...input, ownerId: currentOwnerId }), [currentOwnerId, input.before, input.clientId, input.excludeSessionId, input.exerciseId, state]);
  return { previousPerformance, isLoading: false, error: null as Error | null };
}

export function useQuickValueActions() {
  return useDataContext().data.quickValues;
}
