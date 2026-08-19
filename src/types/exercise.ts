import type { OwnerId } from "./owner";
import type { WorkoutResultType } from "./workout";

export type ExerciseCategory = "strength" | "mobility" | "cardio";
export type ExerciseSource = "built_in" | "custom";
export type ExerciseRestrictionTag =
  | "axialLoads"
  | "behindNeckPull"
  | "breathHold"
  | "gentleOnly"
  | "intensity"
  | "jumps"
  | "kneeStress"
  | "running"
  | "shoulderStress"
  | "staticLoads"
  | "twists";

export type Exercise = {
  id: string;
  ownerId: OwnerId;
  name: string;
  category: ExerciseCategory;
  source?: ExerciseSource;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment: string;
  resultType?: WorkoutResultType;
  searchAliases?: string[];
  restrictionTags?: ExerciseRestrictionTag[];
  coachNotes?: string;
  notes?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
