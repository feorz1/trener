import type { OwnerId } from "./owner";

export type WorkoutSet = {
  id: string;
  order: number;
  targetWeightKg?: number;
  targetReps?: number;
  targetDurationSeconds?: number;
  targetDistanceMeters?: number;
  actualWeightKg?: number;
  actualReps?: number;
  actualDurationSeconds?: number;
  actualDistanceMeters?: number;
  completed: boolean;
};

export type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  resultType?: WorkoutResultType;
  order?: number;
  day?: RepeatDay;
  muscleGroup?: string;
  comment?: string;
  collapsed?: boolean;
  supersetWithNext?: boolean;
  sets: WorkoutSet[];
};

export type WorkoutStatus = "draft" | "planned" | "active" | "inProgress" | "completed" | "cancelled" | "moved";

export type Workout = {
  id: string;
  ownerId: OwnerId;
  clientId?: string;
  title: string;
  startsAt: string;
  timezone?: string;
  durationMinutes: number;
  focus: string;
  location: string;
  status: WorkoutStatus;
  sourceWorkoutId?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  exercises: WorkoutExercise[];
  repeatDays?: RepeatDay[];
  scheduleTimes?: Partial<Record<RepeatDay, string>>;
};

export type WorkoutSessionStatus = "active" | "completed" | "cancelled";

export type WorkoutResultType = "weight_reps" | "reps" | "duration" | "distance_duration";

export type WorkoutSessionExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameSnapshot?: string;
  resultTypeSnapshot?: WorkoutResultType;
  order: number;
  comment?: string;
  plannedSets?: number;
  plannedRepetitions?: number;
  plannedWeight?: number;
};

export type WorkoutSession = {
  id: string;
  ownerId: OwnerId;
  workoutId: string;
  clientId?: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  workoutTitleSnapshot?: string;
  createdAt?: string;
  updatedAt?: string;
  exercises: WorkoutSessionExercise[];
};

export type WorkoutResult = {
  id: string;
  ownerId: OwnerId;
  sessionId: string;
  sessionExerciseItemId?: string;
  exerciseId: string;
  exerciseNameSnapshot?: string;
  resultType?: WorkoutResultType;
  setIndex: number;
  setId?: string;
  weight?: number;
  repetitions?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  unit?: string;
  completed: boolean;
};

export type QuickValueMetric = "weight" | "reps" | "duration" | "distance";

export type QuickValue = {
  id: string;
  ownerId: OwnerId;
  exerciseId: string;
  clientId?: string;
  metric: QuickValueMetric;
  values: number[];
  updatedAt: string;
};

export type ResultHistoryItem = {
  id: string;
  ownerId: OwnerId;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  bestSet: {
    weightKg?: number;
    reps?: number;
    durationSeconds?: number;
    distanceMeters?: number;
  };
  volumeKg: number;
  deltaLabel?: string;
};
