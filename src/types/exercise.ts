export type ExerciseCategory = "strength" | "mobility" | "cardio";

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: string[];
  equipment: string;
  coachNotes?: string;
};
