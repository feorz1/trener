export type WorkoutSet = {
  id: string;
  order: number;
  targetWeightKg?: number;
  targetReps?: number;
  actualWeightKg?: number;
  actualReps?: number;
  completed: boolean;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  comment?: string;
  collapsed?: boolean;
  sets: WorkoutSet[];
};

export type WorkoutStatus = "planned" | "inProgress" | "completed" | "cancelled" | "moved";

export type Workout = {
  id: string;
  clientId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  focus: string;
  location: string;
  status: WorkoutStatus;
  exercises: WorkoutExercise[];
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
