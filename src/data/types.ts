import type { Client, Exercise, QuickValue, QuickValueMetric, RepeatDay, Workout, WorkoutResult, WorkoutSession } from "@/types";

export type EntityId = string;
export type ClientId = EntityId;
export type ExerciseId = EntityId;
export type WorkoutId = EntityId;
export type SessionId = EntityId;
export type ResultId = EntityId;
export type QuickValueId = EntityId;

export type { Client, Exercise, QuickValue, QuickValueMetric, RepeatDay, Workout, WorkoutResult, WorkoutSession };

export type CreateClientInput = {
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  telegram?: string;
  gender?: Client["gender"];
  goal?: string;
  restrictions?: string[];
  status?: Client["status"];
  avatarInitials?: string;
  nextWorkoutAt?: string;
  notes?: string;
  metrics?: Partial<Client["metrics"]>;
};

export type UpdateClientInput = Partial<Omit<Client, "id">>;

export type CreateExerciseInput = {
  name: string;
  category?: Exercise["category"];
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment?: string;
  coachNotes?: string;
  notes?: string;
};

export type CreateWorkoutDraftInput = {
  clientId?: ClientId;
  startsAt?: string;
  durationMinutes?: number;
  title?: string;
  focus?: string;
  location?: string;
  repeatDays?: RepeatDay[];
  scheduleTimes?: Partial<Record<RepeatDay, string>>;
};

export type UpdateWorkoutDraftInput = Partial<Omit<Workout, "id" | "status">>;

export type RescheduleWorkoutInput = {
  startsAt: string;
  timezone?: string;
};

export type SetDraftExercisesOptions = {
  day?: RepeatDay;
};

export type UpdateWorkoutDraftExerciseInput = Partial<Omit<Workout["exercises"][number], "id" | "exerciseId">>;

export type UpdateSessionInput = Partial<Omit<WorkoutSession, "id" | "workoutId">>;

export type UpsertWorkoutResultInput = {
  sessionId: SessionId;
  sessionExerciseItemId?: string;
  exerciseId: ExerciseId;
  setIndex: number;
  setId?: string;
  weight?: number;
  repetitions?: number;
  unit?: string;
  completed?: boolean;
};

export type GetQuickValueInput = {
  exerciseId: ExerciseId;
  metric: QuickValueMetric;
  clientId?: ClientId;
};

export type UpsertQuickValueInput = GetQuickValueInput & {
  values: number[];
};

export type PreviousExercisePerformance = {
  sessionId: SessionId;
  completedAt: string;
  sets: Array<{
    setIndex: number;
    weight?: number;
    repetitions?: number;
    unit?: string;
  }>;
};
