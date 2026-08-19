export type ClientStatusRecord = "ACTIVE" | "ARCHIVED";
export type WorkoutSessionStatusRecord = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export const REPEAT_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type RepeatDayRecord = (typeof REPEAT_DAYS)[number];

export const WORKOUT_RESULT_TYPES = [
  "weight_reps",
  "reps",
  "duration",
  "distance_duration",
  "reps_only",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "weight_reps_rpe",
  "duration_hold",
  "time_result",
  "weight_duration",
  "distance_time",
  "distance_only",
  "weight_distance",
  "time_calories",
  "calories_only",
  "cardio_extended",
  "interval_reps",
  "amrap",
  "side_reps",
  "weight_side_reps",
  "completion_only"
] as const;
export type WorkoutResultTypeRecord = (typeof WORKOUT_RESULT_TYPES)[number];

export const WORKOUT_METRIC_KEYS = [
  "weight",
  "addedWeight",
  "assistance",
  "reps",
  "duration",
  "interval",
  "distance",
  "calories",
  "rpe",
  "rounds",
  "extraReps",
  "leftReps",
  "rightReps",
  "speed",
  "pace",
  "incline",
  "resistance"
] as const;
export type WorkoutMetricKeyRecord = (typeof WORKOUT_METRIC_KEYS)[number];
export type WorkoutMetricValuesRecord = Partial<Record<WorkoutMetricKeyRecord, number>>;

export type PlannedSetTargetRecord = {
  id: string;
  order: number;
  values: WorkoutMetricValuesRecord | null;
  targetWeightKg: number | null;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
};

export type PlannedSetTargetInput = {
  id: string;
  order: number;
  values?: WorkoutMetricValuesRecord | null;
  targetWeightKg?: number | null;
  targetReps?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
};

export type ClientProfileMetricsRecord = {
  weightKg?: number;
  heightCm?: number;
  attendanceRate?: number;
};

export type ClientIntakeProfileRecord = {
  ageYears?: number;
  targetWeightKg?: number;
  healthConstraints?: string[];
  exerciseRestrictions?: string[];
  activityLevel?: string;
  sleep?: string;
  workoutsPerWeek?: number;
  trainingExperience?: string;
  sports?: string[];
};

export type ClientProfileRecord = {
  telegram?: string;
  gender?: "male" | "female";
  goal?: string;
  restrictions?: string[];
  metrics?: ClientProfileMetricsRecord;
  intake?: ClientIntakeProfileRecord;
};

export type ClientProfileInput = Partial<Omit<ClientProfileRecord, "metrics" | "intake">> & {
  metrics?: Partial<ClientProfileMetricsRecord>;
  intake?: Partial<ClientIntakeProfileRecord>;
};

export type ClientRecord = {
  id: string;
  trainerId: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  notes: string | null;
  status: ClientStatusRecord;
  profile: ClientProfileRecord;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ExerciseRecord = {
  id: string;
  trainerId: string | null;
  name: string;
  muscleGroup: string | null;
  primaryMuscles: string[] | null;
  secondaryMuscles: string[] | null;
  equipment: string | null;
  description: string | null;
  resultType: WorkoutResultTypeRecord | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type WorkoutTemplateItemRecord = {
  id: string;
  workoutTemplateId: string;
  exerciseId: string | null;
  order: number;
  titleSnapshot: string | null;
  resultType: WorkoutResultTypeRecord | null;
  day: RepeatDayRecord | null;
  supersetWithNext: boolean | null;
  plannedSetTargets: PlannedSetTargetRecord[] | null;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeight: number | null;
  plannedDurationSec: number | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutTemplateRecord = {
  id: string;
  trainerId: string;
  clientId: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: WorkoutTemplateItemRecord[];
};

export type WorkoutSetResultRecord = {
  id: string;
  workoutSessionItemId: string;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  distanceMeters: number | null;
  completed: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutSessionItemRecord = {
  id: string;
  workoutSessionId: string;
  exerciseId: string | null;
  order: number;
  titleSnapshot: string;
  resultType: WorkoutResultTypeRecord | null;
  day: RepeatDayRecord | null;
  supersetWithNext: boolean | null;
  plannedSetTargets: PlannedSetTargetRecord[] | null;
  plannedSets: number | null;
  plannedReps: number | null;
  plannedWeight: number | null;
  plannedDurationSec: number | null;
  restSeconds: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  setResults: WorkoutSetResultRecord[];
};

export type WorkoutSessionRecord = {
  id: string;
  trainerId: string;
  clientId: string | null;
  workoutTemplateId: string | null;
  title: string;
  status: WorkoutSessionStatusRecord;
  scheduledAt: Date | null;
  timezone: string | null;
  durationMinutes: number | null;
  focus: string | null;
  location: string | null;
  repeatDays: RepeatDayRecord[] | null;
  scheduleTimes: Partial<Record<RepeatDayRecord, string>> | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  items: WorkoutSessionItemRecord[];
};

export type ListClientsQuery = {
  search?: string;
  status?: "active" | "archived";
  limit?: number;
  cursor?: string;
  updatedSince?: Date;
  includeDeleted?: boolean;
};

export type ListSessionsQuery = {
  clientId?: string;
  status?: WorkoutSessionStatusRecord;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
  updatedSince?: Date;
};

export type WorkoutItemInput = {
  id?: string | null;
  exerciseId?: string | null;
  order: number;
  titleSnapshot?: string | null;
  resultType?: WorkoutResultTypeRecord | null;
  day?: RepeatDayRecord | null;
  supersetWithNext?: boolean | null;
  plannedSetTargets?: PlannedSetTargetInput[] | null;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeight?: number | null;
  plannedDurationSec?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
};

export type SetResultInput = {
  id?: string | null;
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  durationSec?: number | null;
  distanceMeters?: number | null;
  completed?: boolean;
  notes?: string | null;
};

export type ClientInput = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  notes?: string | null;
  status?: ClientStatusRecord;
  profile?: ClientProfileInput;
};

export type ExerciseInput = {
  name?: string;
  muscleGroup?: string | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  equipment?: string | null;
  description?: string | null;
  resultType?: WorkoutResultTypeRecord | null;
};

export type WorkoutTemplateInput = {
  clientId?: string | null;
  title?: string;
  description?: string | null;
  notes?: string | null;
  items?: WorkoutItemInput[];
};

export type WorkoutSessionInput = {
  clientId?: string | null;
  workoutTemplateId?: string | null;
  title?: string;
  status?: WorkoutSessionStatusRecord;
  scheduledAt?: Date | null;
  timezone?: string | null;
  durationMinutes?: number | null;
  focus?: string | null;
  location?: string | null;
  repeatDays?: RepeatDayRecord[] | null;
  scheduleTimes?: Partial<Record<RepeatDayRecord, string>> | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  notes?: string | null;
  items?: WorkoutItemInput[];
};

export type TrainerDataBootstrap = {
  serverTime: Date;
  clients: ClientRecord[];
  exercises: ExerciseRecord[];
  workoutTemplates: WorkoutTemplateRecord[];
  workoutSessions: WorkoutSessionRecord[];
};

export interface TrainerDataRepository {
  ready(): Promise<void>;
  listClients(trainerId: string, query?: ListClientsQuery): Promise<{ data: ClientRecord[]; nextCursor: string | null }>;
  createClient(trainerId: string, input: ClientInput & { name: string }): Promise<ClientRecord>;
  getClient(trainerId: string, id: string, includeDeleted?: boolean): Promise<ClientRecord | null>;
  updateClient(trainerId: string, id: string, input: ClientInput): Promise<ClientRecord | null>;
  softDeleteClient(trainerId: string, id: string): Promise<ClientRecord | null>;

  listExercises(trainerId: string): Promise<ExerciseRecord[]>;
  createExercise(trainerId: string, input: ExerciseInput & { name: string }): Promise<ExerciseRecord>;
  getExercise(trainerId: string, id: string): Promise<ExerciseRecord | null>;
  updateExercise(trainerId: string, id: string, input: ExerciseInput): Promise<ExerciseRecord | null>;
  softDeleteExercise(trainerId: string, id: string): Promise<ExerciseRecord | null>;

  listWorkoutTemplates(trainerId: string): Promise<WorkoutTemplateRecord[]>;
  createWorkoutTemplate(trainerId: string, input: WorkoutTemplateInput & { title: string }): Promise<WorkoutTemplateRecord>;
  getWorkoutTemplate(trainerId: string, id: string): Promise<WorkoutTemplateRecord | null>;
  updateWorkoutTemplate(trainerId: string, id: string, input: WorkoutTemplateInput): Promise<WorkoutTemplateRecord | null>;
  softDeleteWorkoutTemplate(trainerId: string, id: string): Promise<WorkoutTemplateRecord | null>;

  listWorkoutSessions(trainerId: string, query?: ListSessionsQuery): Promise<{ data: WorkoutSessionRecord[]; nextCursor: string | null }>;
  createWorkoutSession(trainerId: string, input: WorkoutSessionInput & { title: string }): Promise<WorkoutSessionRecord>;
  getWorkoutSession(trainerId: string, id: string): Promise<WorkoutSessionRecord | null>;
  updateWorkoutSession(trainerId: string, id: string, input: WorkoutSessionInput): Promise<WorkoutSessionRecord | null>;
  softDeleteWorkoutSession(trainerId: string, id: string): Promise<WorkoutSessionRecord | null>;
  setWorkoutSessionStatus(trainerId: string, id: string, status: WorkoutSessionStatusRecord): Promise<WorkoutSessionRecord | null>;
  updateWorkoutResults(trainerId: string, id: string, items: Array<{ id: string; setResults: SetResultInput[] }>): Promise<WorkoutSessionRecord | null>;

  bootstrap(trainerId: string, updatedSince?: Date): Promise<TrainerDataBootstrap>;
  logActivity(userId: string | null, type: string, entityType?: string, entityId?: string, metadata?: unknown): Promise<void>;
}
