import { Exercise, LOCAL_OWNER_ID } from "@/types";
import { exerciseCatalog } from "./exerciseCatalog";

const legacyMockExercises: Exercise[] = [
  {
    id: "ex-1",
    ownerId: LOCAL_OWNER_ID,
    name: "Жим ногами горизонтальный в блочном тренажере",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["legs", "quads"],
    equipment: "Блочный тренажер",
    resultType: "weight_reps",
    restrictionTags: ["kneeStress"],
    coachNotes: "Контролировать амплитуду и не выпрямлять колени до замка."
  },
  {
    id: "ex-2",
    ownerId: LOCAL_OWNER_ID,
    name: "Жим от плеч сидя в рычажном тренажере",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["shoulders", "triceps"],
    equipment: "Рычажный тренажер",
    resultType: "weight_reps",
    restrictionTags: ["shoulderStress", "breathHold"]
  },
  {
    id: "ex-3",
    ownerId: LOCAL_OWNER_ID,
    name: "Подтягивания",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["back", "biceps"],
    equipment: "Турник",
    resultType: "reps_only",
    restrictionTags: ["shoulderStress"]
  },
  {
    id: "ex-4",
    ownerId: LOCAL_OWNER_ID,
    name: "Жим лежа",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["chest", "triceps"],
    equipment: "Штанга, скамья",
    resultType: "weight_reps",
    restrictionTags: ["breathHold"]
  },
  {
    id: "ex-5",
    ownerId: LOCAL_OWNER_ID,
    name: "Отжимания от брусьев",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["chest", "triceps"],
    equipment: "Брусья",
    resultType: "weighted_bodyweight",
    restrictionTags: ["shoulderStress"]
  },
  {
    id: "ex-6",
    ownerId: LOCAL_OWNER_ID,
    name: "Становая тяга",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["back", "legs"],
    equipment: "Штанга",
    resultType: "weight_reps",
    restrictionTags: ["axialLoads", "breathHold"]
  },
  {
    id: "ex-7",
    ownerId: LOCAL_OWNER_ID,
    name: "Приседания со штангой",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["legs", "glutes"],
    equipment: "Штанга",
    resultType: "weight_reps",
    restrictionTags: ["axialLoads", "kneeStress", "breathHold"]
  },
  {
    id: "ex-8",
    ownerId: LOCAL_OWNER_ID,
    name: "Тяга штанги в наклоне",
    category: "strength",
    source: "built_in",
    primaryMuscles: ["back", "biceps"],
    equipment: "Штанга",
    resultType: "weight_reps",
    restrictionTags: ["axialLoads", "breathHold"]
  }
];

export const mockExercises: Exercise[] = [
  ...legacyMockExercises,
  ...exerciseCatalog.map((exercise) => ({
    ...exercise,
    ownerId: LOCAL_OWNER_ID,
    source: "built_in" as const
  }))
];
