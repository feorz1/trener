import { Exercise, LOCAL_OWNER_ID } from "@/types";

export const mockExercises: Exercise[] = [
  {
    id: "ex-1",
    ownerId: LOCAL_OWNER_ID,
    name: "Жим ногами горизонтальный в блочном тренажере",
    category: "strength",
    primaryMuscles: ["legs", "quads"],
    equipment: "Блочный тренажер",
    coachNotes: "Контролировать амплитуду и не выпрямлять колени до замка."
  },
  {
    id: "ex-2",
    ownerId: LOCAL_OWNER_ID,
    name: "Жим от плеч сидя в рычажном тренажере",
    category: "strength",
    primaryMuscles: ["shoulders", "triceps"],
    equipment: "Рычажный тренажер"
  },
  {
    id: "ex-3",
    ownerId: LOCAL_OWNER_ID,
    name: "Подтягивания",
    category: "strength",
    primaryMuscles: ["back", "biceps"],
    equipment: "Турник"
  },
  {
    id: "ex-4",
    ownerId: LOCAL_OWNER_ID,
    name: "Жим лежа",
    category: "strength",
    primaryMuscles: ["chest", "triceps"],
    equipment: "Штанга, скамья"
  },
  {
    id: "ex-5",
    ownerId: LOCAL_OWNER_ID,
    name: "Отжимания от брусьев",
    category: "strength",
    primaryMuscles: ["chest", "triceps"],
    equipment: "Брусья"
  },
  {
    id: "ex-6",
    ownerId: LOCAL_OWNER_ID,
    name: "Становая тяга",
    category: "strength",
    primaryMuscles: ["back", "legs"],
    equipment: "Штанга"
  },
  {
    id: "ex-7",
    ownerId: LOCAL_OWNER_ID,
    name: "Приседания со штангой",
    category: "strength",
    primaryMuscles: ["legs", "glutes"],
    equipment: "Штанга"
  },
  {
    id: "ex-8",
    ownerId: LOCAL_OWNER_ID,
    name: "Тяга штанги в наклоне",
    category: "strength",
    primaryMuscles: ["back", "biceps"],
    equipment: "Штанга"
  }
];
