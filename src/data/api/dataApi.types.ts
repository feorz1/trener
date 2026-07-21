import type { WorkoutResultType } from "../types";

export type AuthorizedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type DataApiPage<T> = {
  data: T[];
  nextCursor: string | null;
};

export type DataApiClientMetrics = {
  weightKg?: number | null;
  heightCm?: number | null;
  attendanceRate?: number | null;
};

export type DataApiClientIntake = {
  ageYears?: number | null;
  targetWeightKg?: number | null;
  healthConstraints?: string[] | null;
  exerciseRestrictions?: string[] | null;
  activityLevel?: string | null;
  sleep?: string | null;
  workoutsPerWeek?: number | null;
  trainingExperience?: string | null;
  sports?: string[] | null;
};

export type DataApiClientProfile = {
  telegram?: string | null;
  gender?: "male" | "female" | null;
  goal?: string | null;
  restrictions?: string[] | null;
  metrics?: DataApiClientMetrics | null;
  intake?: DataApiClientIntake | null;
};

export type DataApiClientProfileInput = {
  telegram?: string;
  gender?: "male" | "female";
  goal?: string;
  restrictions?: string[];
  metrics?: {
    weightKg?: number;
    heightCm?: number;
    attendanceRate?: number;
  };
  intake?: {
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
};

export type DataApiClient = {
  id: string;
  trainerId?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  profile?: DataApiClientProfile | null;
  status?: "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type DataApiExercise = {
  id: string;
  trainerId?: string | null;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  description?: string | null;
  resultType?: WorkoutResultType | null;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type DataApiWorkoutItem = {
  id: string;
  exerciseId?: string | null;
  order: number;
  titleSnapshot?: string | null;
  plannedSets?: number | null;
  plannedReps?: number | null;
  plannedWeight?: number | null;
  plannedDurationSec?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
};

export type DataApiWorkoutTemplate = {
  id: string;
  trainerId?: string;
  clientId?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  items?: DataApiWorkoutItem[];
};

export type DataApiWorkoutSetResult = {
  id?: string;
  workoutSessionItemId?: string;
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  durationSec?: number | null;
  distanceMeters?: number | null;
  completed?: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DataApiWorkoutSessionItem = DataApiWorkoutItem & {
  workoutSessionId?: string;
  titleSnapshot: string;
  setResults?: DataApiWorkoutSetResult[];
};

export type DataApiWorkoutSession = {
  id: string;
  trainerId?: string;
  clientId?: string | null;
  workoutTemplateId?: string | null;
  title: string;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  scheduledAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  items?: DataApiWorkoutSessionItem[];
};

export type DataApiBootstrapPayload = {
  serverTime?: string;
  clients?: DataApiClient[];
  exercises?: DataApiExercise[];
  workoutTemplates?: DataApiWorkoutTemplate[];
  workoutSessions?: DataApiWorkoutSession[];
};

export type DataApiClientInput = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  profile?: DataApiClientProfileInput;
  status?: "active" | "archived";
};

export type DataApiExerciseInput = {
  name?: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  description?: string | null;
};

export type DataApiWorkoutTemplateInput = {
  clientId?: string | null;
  title?: string;
  description?: string | null;
  notes?: string | null;
  items?: Array<Omit<DataApiWorkoutItem, "id"> & { id?: string | null }>;
};

export type DataApiWorkoutSessionInput = {
  clientId?: string | null;
  workoutTemplateId?: string | null;
  title?: string;
  status?: "planned" | "in_progress" | "completed" | "cancelled";
  scheduledAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  notes?: string | null;
  items?: Array<Omit<DataApiWorkoutItem, "id"> & { id?: string | null }>;
};

export type DataApiWorkoutResultsInput = {
  items: Array<{
    id: string;
    setResults: DataApiWorkoutSetResult[];
  }>;
};

export type DataApi = {
  bootstrap(): Promise<DataApiBootstrapPayload>;
  getClients(): Promise<DataApiClient[]>;
  createClient(input: DataApiClientInput & { name: string }): Promise<DataApiClient>;
  updateClient(id: string, patch: DataApiClientInput): Promise<DataApiClient>;
  deleteClient(id: string): Promise<DataApiClient>;
  getExercises(): Promise<DataApiExercise[]>;
  createExercise(input: DataApiExerciseInput & { name: string }): Promise<DataApiExercise>;
  updateExercise(id: string, patch: DataApiExerciseInput): Promise<DataApiExercise>;
  deleteExercise(id: string): Promise<DataApiExercise>;
  getWorkoutTemplates(): Promise<DataApiWorkoutTemplate[]>;
  createWorkoutTemplate(input: DataApiWorkoutTemplateInput & { title: string }): Promise<DataApiWorkoutTemplate>;
  updateWorkoutTemplate(id: string, patch: DataApiWorkoutTemplateInput): Promise<DataApiWorkoutTemplate>;
  deleteWorkoutTemplate(id: string): Promise<DataApiWorkoutTemplate>;
  getWorkoutSessions(): Promise<DataApiPage<DataApiWorkoutSession>>;
  createWorkoutSession(input: DataApiWorkoutSessionInput & { title: string }): Promise<DataApiWorkoutSession>;
  updateWorkoutSession(id: string, patch: DataApiWorkoutSessionInput): Promise<DataApiWorkoutSession>;
  deleteWorkoutSession(id: string): Promise<DataApiWorkoutSession>;
  startWorkoutSession(id: string): Promise<DataApiWorkoutSession>;
  completeWorkoutSession(id: string, input?: Record<string, never>): Promise<DataApiWorkoutSession>;
  cancelWorkoutSession(id: string): Promise<DataApiWorkoutSession>;
  getWorkoutSessionResults(sessionId: string): Promise<DataApiWorkoutSession>;
  upsertWorkoutSessionResults(sessionId: string, input: DataApiWorkoutResultsInput): Promise<DataApiWorkoutSession>;
};
