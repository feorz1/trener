export type ExerciseCategory = "strength" | "mobility" | "cardio";
export type ExerciseSource = "built_in" | "custom";

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  source?: ExerciseSource;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment: string;
  coachNotes?: string;
  notes?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
