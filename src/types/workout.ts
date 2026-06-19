export type WorkoutSet = {
  id: string;
  order: number;
  targetWeightKg?: number;
  targetReps?: number;
  actualWeightKg?: number;
  actualReps?: number;
  completed: boolean;
};

export type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
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
  clientId?: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  focus: string;
  location: string;
  status: WorkoutStatus;
  exercises: WorkoutExercise[];
  repeatDays?: RepeatDay[];
  scheduleTimes?: Partial<Record<RepeatDay, string>>;
};

export type WorkoutSessionStatus = "active" | "completed" | "cancelled";

export type WorkoutSessionExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  comment?: string;
};

export type WorkoutSession = {
  id: string;
  workoutId: string;
  clientId?: string;
  status: WorkoutSessionStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  exercises: WorkoutSessionExercise[];
};

export type WorkoutResult = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  setId?: string;
  weight?: number;
  repetitions?: number;
  unit?: string;
  completed: boolean;
};

export type QuickValueMetric = "weight" | "reps";

export type QuickValue = {
  id: string;
  exerciseId: string;
  clientId?: string;
  metric: QuickValueMetric;
  values: number[];
  updatedAt: string;
};

export type ResultHistoryItem = {
  id: string;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  date: string;
  bestSet: {
    weightKg: number;
    reps: number;
  };
  volumeKg: number;
  deltaLabel?: string;
};
