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
  goal?: string;
  status?: Client["status"];
  avatarInitials?: string;
  nextWorkoutAt?: string;
  notes?: string;
  metrics?: Partial<Client["metrics"]>;
};

export type UpdateClientInput = Partial<Omit<Client, "id">>;

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

export type SetDraftExercisesOptions = {
  day?: RepeatDay;
};

export type UpdateWorkoutDraftExerciseInput = Partial<Omit<Workout["exercises"][number], "id" | "exerciseId">>;

export type UpdateSessionInput = Partial<Omit<WorkoutSession, "id" | "workoutId">>;

export type UpsertWorkoutResultInput = {
  sessionId: SessionId;
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
