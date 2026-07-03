import { useCallback, useMemo, useRef, useState } from "react";
import { useDataContext } from "./DataProvider";
import {
  createDataMutationGuard,
  getDataQueryState,
  toDataError,
  type DataMutationState,
  type DataMutationStatus
} from "./contracts";
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
  selectLatestWorkoutDraft,
  selectWorkoutById,
  selectWorkouts
} from "./local/localSelectors";
import type { ClientId, ExerciseId, QuickValueMetric, SessionId, WorkoutId, WorkoutResultType } from "./types";

function useQueryState() {
  const { hydrationStatus, hydrationError, retryHydration } = useDataContext();
  return useMemo(
    () => getDataQueryState({ hydrationStatus, hydrationError, retryHydration }),
    [hydrationError, hydrationStatus, retryHydration]
  );
}

export function useDataMutation<TArgs extends unknown[], TResult>(
  mutation: (...args: TArgs) => Promise<TResult>
): DataMutationState & { mutate: (...args: TArgs) => Promise<TResult> } {
  const mutationRef = useRef(mutation);
  mutationRef.current = mutation;
  const guardRef = useRef(
    createDataMutationGuard<TArgs, TResult>(async (...args) => {
      try {
        return await mutationRef.current(...args);
      } catch (error) {
        throw toDataError(error);
      }
    })
  );
  const [status, setStatus] = useState<DataMutationStatus>("idle");
  const [error, setError] = useState<DataMutationState["error"]>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const mutate = useCallback((...args: TArgs) => {
    const { promise, started } = guardRef.current.run(...args);
    if (!started) return promise;

    setStatus("submitting");
    setError(null);

    void promise
      .then(() => {
        setStatus("success");
      })
      .catch((caughtError: unknown) => {
        setStatus("error");
        setError(toDataError(caughtError));
      });

    return promise;
  }, []);

  return { status, isSubmitting: status === "submitting", error, reset, mutate };
}

export function useDataLayer() {
  return useDataContext().data;
}

export function useCurrentOwnerId() {
  return useDataContext().currentOwnerId;
}

export function useClients() {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const clients = useMemo(() => selectClients(state, currentOwnerId), [currentOwnerId, state]);
  return { clients, ...query };
}

export function useClient(clientId?: ClientId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const client = useMemo(() => selectClientById(state, clientId, currentOwnerId), [clientId, currentOwnerId, state]);
  return { client, ...query, notFound: !query.isLoading && !query.error && Boolean(clientId && !client) };
}

export function useClientActions() {
  return useDataContext().data.clients;
}

export function useExercises() {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const exercises = useMemo(() => selectExercises(state, currentOwnerId), [currentOwnerId, state]);
  return { exercises, ...query };
}

export function useExercise(exerciseId?: ExerciseId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const exercise = useMemo(() => selectExerciseById(state, exerciseId, currentOwnerId), [currentOwnerId, exerciseId, state]);
  return { exercise, ...query, notFound: !query.isLoading && !query.error && Boolean(exerciseId && !exercise) };
}

export function useExerciseActions() {
  return useDataContext().data.exercises;
}

export function useWorkouts() {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const workouts = useMemo(() => selectWorkouts(state, currentOwnerId), [currentOwnerId, state]);
  return { workouts, ...query };
}

export function useWorkout(workoutId?: WorkoutId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const workout = useMemo(() => selectWorkoutById(state, workoutId, currentOwnerId), [currentOwnerId, state, workoutId]);
  return { workout, ...query, notFound: !query.isLoading && !query.error && Boolean(workoutId && !workout) };
}

export function useWorkoutDraft(draftId?: WorkoutId) {
  const result = useWorkout(draftId);
  const workout = result.workout?.status === "draft" ? result.workout : null;
  return { ...result, workout, draft: workout, notFound: !result.isLoading && !result.error && Boolean(draftId && !workout) };
}

export function useLatestWorkoutDraft() {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const draft = useMemo(() => selectLatestWorkoutDraft(state, currentOwnerId), [currentOwnerId, state]);
  return { draft, ...query };
}

export function useWorkoutActions() {
  return useDataContext().data.workouts;
}

export function useSessions() {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const sessions = useMemo(() => selectSessions(state, currentOwnerId), [currentOwnerId, state]);
  return { sessions, ...query };
}

export function useSession(sessionId?: SessionId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const session = useMemo(() => selectSessionById(state, sessionId, currentOwnerId), [currentOwnerId, sessionId, state]);
  return { session, ...query, notFound: !query.isLoading && !query.error && Boolean(sessionId && !session) };
}

export function useSessionActions() {
  return useDataContext().data.sessions;
}

export function useSessionResults(sessionId?: SessionId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const results = useMemo(() => selectResultsBySession(state, sessionId, currentOwnerId), [currentOwnerId, sessionId, state]);
  return { results, ...query };
}

export function useClientWorkoutHistory(clientId?: ClientId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const sessions = useMemo(() => selectCompletedSessionsByClient(state, clientId, currentOwnerId), [clientId, currentOwnerId, state]);
  return { sessions, ...query };
}

export function useResults() {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const results = useMemo(() => state.resultIds.map((id) => state.resultsById[id]).filter((result) => result.ownerId === currentOwnerId).map((result) => ({ ...result })), [currentOwnerId, state]);
  return { results, ...query };
}

export function useResultActions() {
  return useDataContext().data.results;
}

export function useQuickValue(exerciseId?: ExerciseId, metric?: QuickValueMetric, clientId?: ClientId) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const quickValue = useMemo(() => selectQuickValue(state, { ownerId: currentOwnerId, exerciseId, metric, clientId }), [clientId, currentOwnerId, exerciseId, metric, state]);
  return { quickValue, ...query };
}

export function usePreviousExercisePerformance(input: { clientId?: ClientId; exerciseId?: ExerciseId; resultType?: WorkoutResultType; before?: string; excludeSessionId?: SessionId }) {
  const { currentOwnerId, state } = useDataContext();
  const query = useQueryState();
  const previousPerformance = useMemo(() => selectPreviousExercisePerformance(state, { ...input, ownerId: currentOwnerId }), [currentOwnerId, input.before, input.clientId, input.excludeSessionId, input.exerciseId, input.resultType, state]);
  return { previousPerformance, ...query };
}

export function useQuickValueActions() {
  return useDataContext().data.quickValues;
}
