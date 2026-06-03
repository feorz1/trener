import { Exercise } from "@/types";

export const mockExercises: Exercise[] = [
  {
    id: "ex-1",
    name: "Жим ногами горизонтальный в блочном тренажере",
    category: "strength",
    primaryMuscles: ["legs", "quads"],
    equipment: "Блочный тренажер",
    coachNotes: "Контролировать амплитуду и не выпрямлять колени до замка."
  },
  {
    id: "ex-2",
    name: "Жим от плеч сидя в рычажном тренажере",
    category: "strength",
    primaryMuscles: ["shoulders", "triceps"],
    equipment: "Рычажный тренажер"
  },
  {
    id: "ex-3",
    name: "Подтягивания",
    category: "strength",
    primaryMuscles: ["back", "biceps"],
    equipment: "Турник"
  },
  {
    id: "ex-4",
    name: "Жим лежа",
    category: "strength",
    primaryMuscles: ["chest", "triceps"],
    equipment: "Штанга, скамья"
  },
  {
    id: "ex-5",
    name: "Отжимания от брусьев",
    category: "strength",
    primaryMuscles: ["chest", "triceps"],
    equipment: "Брусья"
  },
  {
    id: "ex-6",
    name: "Становая тяга",
    category: "strength",
    primaryMuscles: ["back", "legs"],
    equipment: "Штанга"
  },
  {
    id: "ex-7",
    name: "Приседания со штангой",
    category: "strength",
    primaryMuscles: ["legs", "glutes"],
    equipment: "Штанга"
  },
  {
    id: "ex-8",
    name: "Тяга штанги в наклоне",
    category: "strength",
    primaryMuscles: ["back", "biceps"],
    equipment: "Штанга"
  }
];
