import type {
  ClientId,
  CreateClientInput,
  CreateExerciseInput,
  CreateWorkoutDraftInput,
  DataLayer,
  ExerciseId,
  GetQuickValueInput,
  QuickValue,
  ResultId,
  SessionId,
  SetDraftExercisesOptions,
  UpdateClientInput,
  UpdateExerciseInput,
  UpdateSessionInput,
  UpdateWorkoutDraftExerciseInput,
  UpdateWorkoutDraftInput,
  UpsertQuickValueInput,
  UpsertWorkoutResultInput,
  WorkoutId,
  RescheduleWorkoutInput
} from "@/data";
import { ApiCancelledError, ApiError } from "./errors";

export type ApiCachePolicy = "cache_first" | "network_only" | "stale_while_revalidate" | "no_store";
export type ApiIdempotencyPolicy = "forbidden" | "optional" | "required";

export type ApiRepositoryOperation =
  | "clients.list"
  | "clients.getById"
  | "clients.create"
  | "clients.update"
  | "clients.remove"
  | "exercises.list"
  | "exercises.getById"
  | "exercises.create"
  | "exercises.update"
  | "exercises.archive"
  | "workouts.list"
  | "workouts.getById"
  | "workouts.createDraft"
  | "workouts.updateDraft"
  | "workouts.setDraftClient"
  | "workouts.setDraftExercises"
  | "workouts.updateDraftExercise"
  | "workouts.removeDraftExercise"
  | "workouts.reorderDraftExercises"
  | "workouts.addExercise"
  | "workouts.removeExercise"
  | "workouts.createEditDraft"
  | "workouts.applyEditDraft"
  | "workouts.publishDraft"
  | "workouts.discardDraft"
  | "workouts.reschedule"
  | "workouts.cancel"
  | "sessions.list"
  | "sessions.listCompletedByClient"
  | "sessions.getById"
  | "sessions.start"
  | "sessions.addExercise"
  | "sessions.removeExercise"
  | "sessions.update"
  | "sessions.complete"
  | "sessions.getPreviousExercisePerformance"
  | "results.listBySession"
  | "results.upsertSetResult"
  | "results.remove"
  | "quickValues.getForExercise"
  | "quickValues.upsert"
  | "quickValues.remove";

export type ApiOperationContract = {
  method: "query" | "mutation";
  cachePolicy: ApiCachePolicy;
  idempotency: ApiIdempotencyPolicy;
  cancellation: "supported";
};

const query = {
  method: "query",
  cachePolicy: "stale_while_revalidate",
  idempotency: "forbidden",
  cancellation: "supported"
} satisfies ApiOperationContract;

const mutation = {
  method: "mutation",
  cachePolicy: "no_store",
  idempotency: "required",
  cancellation: "supported"
} satisfies ApiOperationContract;

export const API_OPERATION_CONTRACTS = {
  "clients.list": query,
  "clients.getById": query,
  "clients.create": mutation,
  "clients.update": mutation,
  "clients.remove": mutation,
  "exercises.list": query,
  "exercises.getById": query,
  "exercises.create": mutation,
  "exercises.update": mutation,
  "exercises.archive": mutation,
  "workouts.list": query,
  "workouts.getById": query,
  "workouts.createDraft": mutation,
  "workouts.updateDraft": mutation,
  "workouts.setDraftClient": mutation,
  "workouts.setDraftExercises": mutation,
  "workouts.updateDraftExercise": mutation,
  "workouts.removeDraftExercise": mutation,
  "workouts.reorderDraftExercises": mutation,
  "workouts.addExercise": mutation,
  "workouts.removeExercise": mutation,
  "workouts.createEditDraft": mutation,
  "workouts.applyEditDraft": mutation,
  "workouts.publishDraft": mutation,
  "workouts.discardDraft": mutation,
  "workouts.reschedule": mutation,
  "workouts.cancel": mutation,
  "sessions.list": query,
  "sessions.listCompletedByClient": query,
  "sessions.getById": query,
  "sessions.start": mutation,
  "sessions.addExercise": mutation,
  "sessions.removeExercise": mutation,
  "sessions.update": mutation,
  "sessions.complete": mutation,
  "sessions.getPreviousExercisePerformance": query,
  "results.listBySession": query,
  "results.upsertSetResult": mutation,
  "results.remove": mutation,
  "quickValues.getForExercise": query,
  "quickValues.upsert": mutation,
  "quickValues.remove": mutation
} as const satisfies Record<ApiRepositoryOperation, ApiOperationContract>;

export type ApiRequestOptions = {
  signal?: AbortSignal;
  idempotencyKey?: string;
  cachePolicy?: ApiCachePolicy;
  requestId?: string;
};

export type ApiRequestContext = Required<Pick<ApiOperationContract, "cachePolicy" | "idempotency">> & {
  operation: ApiRepositoryOperation;
  signal?: AbortSignal;
  idempotencyKey?: string;
  requestId?: string;
};

export type ApiTransportRequest = {
  operation: ApiRepositoryOperation;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  context: ApiRequestContext;
};

export interface ApiTransport {
  request<TDto>(request: ApiTransportRequest): Promise<TDto>;
}

export function assertApiRequestNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ApiCancelledError();
  }
}

export function createApiRequestContext(operation: ApiRepositoryOperation, options: ApiRequestOptions = {}): ApiRequestContext {
  const contract = API_OPERATION_CONTRACTS[operation];
  assertApiRequestNotCancelled(options.signal);

  if (contract.idempotency === "required" && !options.idempotencyKey) {
    throw new ApiError("idempotency_required", `Idempotency key is required for ${operation}`, { retryable: false });
  }

  if (contract.idempotency === "forbidden" && options.idempotencyKey) {
    throw new ApiError("validation", `Idempotency key is not accepted for ${operation}`, { retryable: false });
  }

  return {
    operation,
    signal: options.signal,
    idempotencyKey: options.idempotencyKey,
    requestId: options.requestId,
    cachePolicy: options.cachePolicy ?? contract.cachePolicy,
    idempotency: contract.idempotency
  };
}

export function createIdempotencyKey(operation: ApiRepositoryOperation, entityId: string, actionId: string): string {
  return `${operation}:${entityId}:${actionId}`;
}

export type ApiClientRepository = {
  list(options?: ApiRequestOptions): ReturnType<DataLayer["clients"]["list"]>;
  getById(id: ClientId, options?: ApiRequestOptions): ReturnType<DataLayer["clients"]["getById"]>;
  create(input: CreateClientInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["clients"]["create"]>;
  update(id: ClientId, patch: UpdateClientInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["clients"]["update"]>;
  remove(id: ClientId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["clients"]["remove"]>;
};

export type ApiExerciseRepository = {
  list(options?: ApiRequestOptions): ReturnType<DataLayer["exercises"]["list"]>;
  getById(id: ExerciseId, options?: ApiRequestOptions): ReturnType<DataLayer["exercises"]["getById"]>;
  create(input: CreateExerciseInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["exercises"]["create"]>;
  update(id: ExerciseId, patch: UpdateExerciseInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["exercises"]["update"]>;
  archive(id: ExerciseId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["exercises"]["archive"]>;
};

export type ApiWorkoutRepository = {
  list(options?: ApiRequestOptions): ReturnType<DataLayer["workouts"]["list"]>;
  getById(id: WorkoutId, options?: ApiRequestOptions): ReturnType<DataLayer["workouts"]["getById"]>;
  createDraft(input: CreateWorkoutDraftInput | undefined, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["createDraft"]>;
  updateDraft(draftId: WorkoutId, patch: UpdateWorkoutDraftInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["updateDraft"]>;
  setDraftClient(draftId: WorkoutId, clientId: ClientId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["setDraftClient"]>;
  setDraftExercises(
    draftId: WorkoutId,
    exerciseIds: ExerciseId[],
    setOptions: SetDraftExercisesOptions | undefined,
    options: ApiRequestOptions & { idempotencyKey: string }
  ): ReturnType<DataLayer["workouts"]["setDraftExercises"]>;
  updateDraftExercise(
    draftId: WorkoutId,
    itemId: string,
    patch: UpdateWorkoutDraftExerciseInput,
    options: ApiRequestOptions & { idempotencyKey: string }
  ): ReturnType<DataLayer["workouts"]["updateDraftExercise"]>;
  removeDraftExercise(draftId: WorkoutId, itemId: string, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["removeDraftExercise"]>;
  reorderDraftExercises(draftId: WorkoutId, orderedItemIds: string[], options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["reorderDraftExercises"]>;
  addExercise(draftId: WorkoutId, exerciseId: ExerciseId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["addExercise"]>;
  removeExercise(draftId: WorkoutId, exerciseId: ExerciseId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["removeExercise"]>;
  createEditDraft(workoutId: WorkoutId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["createEditDraft"]>;
  applyEditDraft(draftId: WorkoutId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["applyEditDraft"]>;
  publishDraft(draftId: WorkoutId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["publishDraft"]>;
  discardDraft(draftId: WorkoutId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["discardDraft"]>;
  reschedule(workoutId: WorkoutId, input: RescheduleWorkoutInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["reschedule"]>;
  cancel(workoutId: WorkoutId, input: { reason?: string } | undefined, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["workouts"]["cancel"]>;
};

export type ApiSessionRepository = {
  list(options?: ApiRequestOptions): ReturnType<DataLayer["sessions"]["list"]>;
  listCompletedByClient(clientId: ClientId, options?: ApiRequestOptions): ReturnType<DataLayer["sessions"]["listCompletedByClient"]>;
  getById(sessionId: SessionId, options?: ApiRequestOptions): ReturnType<DataLayer["sessions"]["getById"]>;
  start(workoutId: WorkoutId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["sessions"]["start"]>;
  addExercise(sessionId: SessionId, exerciseId: ExerciseId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["sessions"]["addExercise"]>;
  removeExercise(sessionId: SessionId, exerciseId: ExerciseId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["sessions"]["removeExercise"]>;
  update(sessionId: SessionId, patch: UpdateSessionInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["sessions"]["update"]>;
  complete(sessionId: SessionId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["sessions"]["complete"]>;
  getPreviousExercisePerformance(
    input: Parameters<DataLayer["sessions"]["getPreviousExercisePerformance"]>[0],
    options?: ApiRequestOptions
  ): ReturnType<DataLayer["sessions"]["getPreviousExercisePerformance"]>;
};

export type ApiResultRepository = {
  listBySession(sessionId: SessionId, options?: ApiRequestOptions): ReturnType<DataLayer["results"]["listBySession"]>;
  upsertSetResult(input: UpsertWorkoutResultInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["results"]["upsertSetResult"]>;
  remove(resultId: ResultId, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["results"]["remove"]>;
};

export type ApiQuickValueRepository = {
  getForExercise(input: GetQuickValueInput, options?: ApiRequestOptions): ReturnType<DataLayer["quickValues"]["getForExercise"]>;
  upsert(input: UpsertQuickValueInput, options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["quickValues"]["upsert"]>;
  remove(id: QuickValue["id"], options: ApiRequestOptions & { idempotencyKey: string }): ReturnType<DataLayer["quickValues"]["remove"]>;
};

export type ApiDataLayer = {
  clients: ApiClientRepository;
  exercises: ApiExerciseRepository;
  workouts: ApiWorkoutRepository;
  sessions: ApiSessionRepository;
  results: ApiResultRepository;
  quickValues: ApiQuickValueRepository;
};

export type ApiRepositoryAdapterFactory = (transport: ApiTransport) => ApiDataLayer;
