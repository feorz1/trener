import type {
  Client,
  ClientId,
  CreateClientInput,
  CreateExerciseInput,
  CreateWorkoutDraftInput,
  Exercise,
  ExerciseId,
  ResultId,
  SessionId,
  UpdateClientInput,
  UpdateExerciseInput,
  UpdateSessionInput,
  UpdateWorkoutDraftInput,
  SetDraftExercisesOptions,
  UpdateWorkoutDraftExerciseInput,
  PreviousExercisePerformance,
  RescheduleWorkoutInput,
  GetQuickValueInput,
  UpsertWorkoutResultInput,
  UpsertQuickValueInput,
  Workout,
  WorkoutId,
  WorkoutResult,
  WorkoutSession,
  QuickValue
} from "./types";

export type DataErrorCode = "not_found" | "active_session_conflict" | "persistence" | "validation" | "unknown";

export class DataError extends Error {
  readonly retryable: boolean;

  constructor(
    public readonly code: DataErrorCode,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "DataError";
    this.retryable = options.retryable ?? (code === "persistence" || code === "unknown");
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class DataNotFoundError extends DataError {
  constructor(
    public readonly entity: string,
    public readonly id: string
  ) {
    super("not_found", `${entity} not found: ${id}`, { retryable: false });
    this.name = "DataNotFoundError";
  }
}

export class ActiveSessionConflictError extends DataError {
  constructor(public readonly activeSession: WorkoutSession) {
    super("active_session_conflict", `Active session already exists: ${activeSession.id}`, { retryable: false });
    this.name = "ActiveSessionConflictError";
  }
}

export function isActiveSessionConflictError(error: unknown): error is ActiveSessionConflictError {
  return error instanceof ActiveSessionConflictError;
}

export function toDataError(error: unknown, fallbackMessage = "Data operation failed"): DataError {
  if (error instanceof DataError) return error;
  if (error instanceof Error) {
    return new DataError("unknown", error.message || fallbackMessage, { cause: error });
  }
  return new DataError("unknown", fallbackMessage, { cause: error });
}

export type DataQueryHydrationStatus = "idle" | "loading" | "ready" | "error";

export type DataQueryState = {
  isLoading: boolean;
  error: DataError | null;
  retry: () => void;
  refetch: () => void;
};

export function getDataQueryState(input: {
  hydrationStatus: DataQueryHydrationStatus;
  hydrationError: Error | null;
  retryHydration: () => void;
}): DataQueryState {
  const error = input.hydrationStatus === "error" && input.hydrationError ? toDataError(input.hydrationError, "Local data hydration failed") : null;

  return {
    isLoading: input.hydrationStatus === "idle" || input.hydrationStatus === "loading",
    error,
    retry: input.retryHydration,
    refetch: input.retryHydration
  };
}

export type DataMutationStatus = "idle" | "submitting" | "success" | "error";

export type DataMutationState = {
  status: DataMutationStatus;
  isSubmitting: boolean;
  error: DataError | null;
  reset: () => void;
};

export function createDataMutationGuard<TArgs extends unknown[], TResult>(
  mutation: (...args: TArgs) => Promise<TResult>
) {
  let inFlight: Promise<TResult> | null = null;

  return {
    run(...args: TArgs) {
      if (inFlight) return { promise: inFlight, started: false };

      const promise = mutation(...args).finally(() => {
        if (inFlight === promise) {
          inFlight = null;
        }
      });
      inFlight = promise;
      return { promise, started: true };
    },
    isSubmitting() {
      return Boolean(inFlight);
    }
  };
}

export interface ClientRepository {
  list(): Promise<Client[]>;
  getById(id: ClientId): Promise<Client | null>;
  create(input: CreateClientInput): Promise<Client>;
  update(id: ClientId, patch: UpdateClientInput): Promise<Client>;
  remove(id: ClientId): Promise<void>;
}

export interface ExerciseRepository {
  list(): Promise<Exercise[]>;
  getById(id: ExerciseId): Promise<Exercise | null>;
  create(input: CreateExerciseInput): Promise<Exercise>;
  update(id: ExerciseId, patch: UpdateExerciseInput): Promise<Exercise>;
  archive(id: ExerciseId): Promise<Exercise>;
}

export interface WorkoutRepository {
  list(): Promise<Workout[]>;
  getById(id: WorkoutId): Promise<Workout | null>;
  createDraft(input?: CreateWorkoutDraftInput): Promise<Workout>;
  updateDraft(draftId: WorkoutId, patch: UpdateWorkoutDraftInput): Promise<Workout>;
  setDraftClient(draftId: WorkoutId, clientId: ClientId): Promise<Workout>;
  setDraftExercises(draftId: WorkoutId, exerciseIds: ExerciseId[], options?: SetDraftExercisesOptions): Promise<Workout>;
  updateDraftExercise(draftId: WorkoutId, itemId: string, patch: UpdateWorkoutDraftExerciseInput): Promise<Workout>;
  removeDraftExercise(draftId: WorkoutId, itemId: string): Promise<Workout>;
  reorderDraftExercises(draftId: WorkoutId, orderedItemIds: string[]): Promise<Workout>;
  addExercise(draftId: WorkoutId, exerciseId: ExerciseId): Promise<Workout>;
  removeExercise(draftId: WorkoutId, exerciseId: ExerciseId): Promise<Workout>;
  createEditDraft(workoutId: WorkoutId): Promise<Workout>;
  applyEditDraft(draftId: WorkoutId): Promise<Workout>;
  publishDraft(draftId: WorkoutId): Promise<Workout>;
  discardDraft(draftId: WorkoutId): Promise<void>;
  reschedule(workoutId: WorkoutId, input: RescheduleWorkoutInput): Promise<Workout>;
  cancel(workoutId: WorkoutId, input?: { reason?: string }): Promise<Workout>;
}

export interface SessionRepository {
  list(): Promise<WorkoutSession[]>;
  listCompletedByClient(clientId: ClientId): Promise<WorkoutSession[]>;
  getById(sessionId: SessionId): Promise<WorkoutSession | null>;
  start(workoutId: WorkoutId): Promise<WorkoutSession>;
  addExercise(sessionId: SessionId, exerciseId: ExerciseId): Promise<WorkoutSession>;
  removeExercise(sessionId: SessionId, exerciseId: ExerciseId): Promise<WorkoutSession>;
  update(sessionId: SessionId, patch: UpdateSessionInput): Promise<WorkoutSession>;
  complete(sessionId: SessionId): Promise<WorkoutSession>;
  getPreviousExercisePerformance(input: {
    clientId?: ClientId;
    exerciseId: ExerciseId;
    resultType?: WorkoutResult["resultType"];
    before?: string;
    excludeSessionId?: SessionId;
  }): Promise<PreviousExercisePerformance | null>;
}

export interface ResultRepository {
  listBySession(sessionId: SessionId): Promise<WorkoutResult[]>;
  upsertSetResult(input: UpsertWorkoutResultInput): Promise<WorkoutResult>;
  remove(resultId: ResultId): Promise<void>;
}

export interface QuickValueRepository {
  getForExercise(input: GetQuickValueInput): Promise<QuickValue | null>;
  upsert(input: UpsertQuickValueInput): Promise<QuickValue>;
  remove(id: QuickValue["id"]): Promise<void>;
}

export interface DataLayer {
  clients: ClientRepository;
  exercises: ExerciseRepository;
  workouts: WorkoutRepository;
  sessions: SessionRepository;
  results: ResultRepository;
  quickValues: QuickValueRepository;
}
