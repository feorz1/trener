import type {
  Client,
  Exercise,
  PreviousExercisePerformance,
  QuickValue,
  QuickValueMetric,
  RepeatDay,
  Workout,
  WorkoutResult,
  WorkoutResultType,
  WorkoutSession,
  WorkoutSessionExercise
} from "@/data/types";

export type ApiIsoDateString = string;
export type ApiEntityId = string;
type DomainWorkoutExercise = Workout["exercises"][number];
type DomainWorkoutSet = Workout["exercises"][number]["sets"][number];

export type ApiCollectionEnvelopeDto<T> = {
  data: T[];
  next_cursor?: string;
};

export type ApiClientDto = {
  id: ApiEntityId;
  owner_id: ApiEntityId;
  name: string;
  phone?: string;
  email?: string;
  birth_date?: ApiIsoDateString;
  telegram?: string;
  gender?: Client["gender"];
  goal: string;
  status: Client["status"];
  avatar_initials: string;
  next_workout_at: ApiIsoDateString;
  notes: string;
  restrictions?: string[];
  created_at?: ApiIsoDateString;
  updated_at?: ApiIsoDateString;
  metrics: {
    weight_kg: number;
    height_cm: number;
    attendance_rate: number;
  };
};

export type ApiExerciseDto = {
  id: ApiEntityId;
  owner_id: ApiEntityId;
  name: string;
  category: Exercise["category"];
  source?: Exercise["source"];
  primary_muscles: string[];
  secondary_muscles?: string[];
  equipment: string;
  coach_notes?: string;
  notes?: string;
  archived_at?: ApiIsoDateString;
  created_at?: ApiIsoDateString;
  updated_at?: ApiIsoDateString;
};

export type ApiWorkoutSetDto = {
  id: ApiEntityId;
  order: number;
  target_weight_kg?: number;
  target_reps?: number;
  target_duration_seconds?: number;
  target_distance_meters?: number;
  actual_weight_kg?: number;
  actual_reps?: number;
  actual_duration_seconds?: number;
  actual_distance_meters?: number;
  completed: boolean;
};

export type ApiWorkoutExerciseDto = {
  id: ApiEntityId;
  exercise_id: ApiEntityId;
  exercise_name: string;
  result_type?: WorkoutResultType;
  order?: number;
  day?: RepeatDay;
  muscle_group?: string;
  comment?: string;
  collapsed?: boolean;
  superset_with_next?: boolean;
  sets: ApiWorkoutSetDto[];
};

export type ApiWorkoutDto = {
  id: ApiEntityId;
  owner_id: ApiEntityId;
  client_id?: ApiEntityId;
  title: string;
  starts_at: ApiIsoDateString;
  timezone?: string;
  duration_minutes: number;
  focus: string;
  location: string;
  status: Workout["status"];
  source_workout_id?: ApiEntityId;
  cancelled_at?: ApiIsoDateString;
  cancellation_reason?: string;
  created_at?: ApiIsoDateString;
  updated_at?: ApiIsoDateString;
  exercises: ApiWorkoutExerciseDto[];
  repeat_days?: RepeatDay[];
  schedule_times?: Partial<Record<RepeatDay, string>>;
};

export type ApiWorkoutSessionExerciseDto = {
  id: ApiEntityId;
  exercise_id: ApiEntityId;
  exercise_name: string;
  exercise_name_snapshot?: string;
  result_type_snapshot?: WorkoutResultType;
  order: number;
  comment?: string;
  planned_sets?: number;
  planned_repetitions?: number;
  planned_weight?: number;
};

export type ApiWorkoutSessionDto = {
  id: ApiEntityId;
  owner_id: ApiEntityId;
  workout_id: ApiEntityId;
  client_id?: ApiEntityId;
  status: WorkoutSession["status"];
  started_at: ApiIsoDateString;
  started_timezone?: string;
  completed_at?: ApiIsoDateString;
  completed_timezone?: string;
  duration_seconds?: number;
  workout_title_snapshot?: string;
  created_at?: ApiIsoDateString;
  updated_at?: ApiIsoDateString;
  exercises: ApiWorkoutSessionExerciseDto[];
};

export type ApiWorkoutResultDto = {
  id: ApiEntityId;
  owner_id: ApiEntityId;
  session_id: ApiEntityId;
  session_exercise_item_id?: ApiEntityId;
  exercise_id: ApiEntityId;
  exercise_name_snapshot?: string;
  result_type?: WorkoutResultType;
  set_index: number;
  set_id?: ApiEntityId;
  weight?: number;
  repetitions?: number;
  duration_seconds?: number;
  distance_meters?: number;
  unit?: string;
  completed: boolean;
};

export type ApiQuickValueDto = {
  id: ApiEntityId;
  owner_id: ApiEntityId;
  exercise_id: ApiEntityId;
  client_id?: ApiEntityId;
  metric: QuickValueMetric;
  values: number[];
  updated_at: ApiIsoDateString;
};

export type ApiPreviousExercisePerformanceDto = {
  session_id: ApiEntityId;
  completed_at: ApiIsoDateString;
  result_type: WorkoutResultType;
  exercise_name: string;
  sets: Array<{
    set_index: number;
    result_type: WorkoutResultType;
    weight?: number;
    repetitions?: number;
    duration_seconds?: number;
    distance_meters?: number;
    unit?: string;
  }>;
};

export type ApiDomainDtoMap = {
  client: { dto: ApiClientDto; domain: Client };
  exercise: { dto: ApiExerciseDto; domain: Exercise };
  workout: { dto: ApiWorkoutDto; domain: Workout };
  workoutSet: { dto: ApiWorkoutSetDto; domain: DomainWorkoutSet };
  workoutExercise: { dto: ApiWorkoutExerciseDto; domain: DomainWorkoutExercise };
  session: { dto: ApiWorkoutSessionDto; domain: WorkoutSession };
  sessionExercise: { dto: ApiWorkoutSessionExerciseDto; domain: WorkoutSessionExercise };
  result: { dto: ApiWorkoutResultDto; domain: WorkoutResult };
  quickValue: { dto: ApiQuickValueDto; domain: QuickValue };
  previousExercisePerformance: { dto: ApiPreviousExercisePerformanceDto; domain: PreviousExercisePerformance };
};
