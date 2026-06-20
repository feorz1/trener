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

export class DataNotFoundError extends Error {
  constructor(
    public readonly entity: string,
    public readonly id: string
  ) {
    super(`${entity} not found: ${id}`);
    this.name = "DataNotFoundError";
  }
}

export interface ClientRepository {
  list(): Promise<Client[]>;
  getById(id: ClientId): Promise<Client | null>;
  create(input: CreateClientInput): Promise<Client>;
  update(id: ClientId, patch: UpdateClientInput): Promise<Client>;
}

export interface ExerciseRepository {
  list(): Promise<Exercise[]>;
  getById(id: ExerciseId): Promise<Exercise | null>;
  create(input: CreateExerciseInput): Promise<Exercise>;
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
