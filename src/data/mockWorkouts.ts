import { LOCAL_OWNER_ID, ResultHistoryItem, Workout } from "@/types";
import { atToday } from "./mockClients";

export const mockWorkouts: Workout[] = [
  {
    id: "workout-1",
    ownerId: LOCAL_OWNER_ID,
    clientId: "client-1",
    title: "Верх тела",
    startsAt: atToday(9, 30),
    durationMinutes: 55,
    focus: "Жимы и стабилизация",
    location: "Зал 1",
    status: "planned",
    exercises: [
      {
        id: "we-1",
        exerciseId: "ex-4",
        exerciseName: "Жим лежа",
        muscleGroup: "Грудь · трицепс",
        comment: "Разминку начать с пустого грифа, рабочие подходы не форсировать.",
        sets: [
          { id: "set-1", order: 1, targetWeightKg: 12, targetReps: 12, completed: false },
          { id: "set-2", order: 2, targetWeightKg: 14, targetReps: 10, completed: false },
          { id: "set-3", order: 3, targetWeightKg: 14, targetReps: 10, completed: false }
        ]
      },
      {
        id: "we-2",
        exerciseId: "ex-2",
        exerciseName: "Жим от плеч сидя в рычажном тренажере",
        muscleGroup: "Плечи · трицепс",
        sets: [
          { id: "set-4", order: 1, targetWeightKg: 32, targetReps: 12, completed: false },
          { id: "set-5", order: 2, targetWeightKg: 36, targetReps: 10, completed: false }
        ]
      }
    ]
  },
  {
    id: "workout-2",
    ownerId: LOCAL_OWNER_ID,
    clientId: "client-2",
    title: "Спина и ноги",
    startsAt: atToday(12, 0),
    durationMinutes: 60,
    focus: "Объем без отказа",
    location: "Зал 2",
    status: "inProgress",
    exercises: [
      {
        id: "we-3",
        exerciseId: "ex-3",
        exerciseName: "Подтягивания",
        muscleGroup: "Спина · бицепс",
        sets: [
          { id: "set-6", order: 1, targetWeightKg: 20, targetReps: 12, completed: true },
          { id: "set-7", order: 2, targetWeightKg: 24, targetReps: 10, completed: false }
        ]
      },
      {
        id: "we-4",
        exerciseId: "ex-7",
        exerciseName: "Приседания со штангой",
        muscleGroup: "Ноги · ягодицы",
        sets: [
          { id: "set-8", order: 1, targetWeightKg: 40, targetReps: 10, completed: true },
          { id: "set-9", order: 2, targetWeightKg: 45, targetReps: 8, completed: false }
        ]
      }
    ]
  },
  {
    id: "workout-3",
    ownerId: LOCAL_OWNER_ID,
    clientId: "client-3",
    title: "Фулбоди",
    startsAt: atToday(18, 30),
    durationMinutes: 50,
    focus: "Мягкое возвращение к нагрузке",
    location: "Зал 1",
    status: "planned",
    exercises: [
      {
        id: "we-5",
        exerciseId: "ex-1",
        exerciseName: "Жим ногами горизонтальный в блочном тренажере",
        muscleGroup: "Ноги · квадрицепс",
        sets: [
          { id: "set-10", order: 1, targetWeightKg: 40, targetReps: 12, completed: false },
          { id: "set-11", order: 2, targetWeightKg: 45, targetReps: 10, completed: false }
        ]
      },
      {
        id: "we-6",
        exerciseId: "ex-8",
        exerciseName: "Тяга штанги в наклоне",
        muscleGroup: "Спина · бицепс",
        sets: [
          { id: "set-12", order: 1, targetWeightKg: 22, targetReps: 12, completed: false },
          { id: "set-13", order: 2, targetWeightKg: 24, targetReps: 10, completed: false }
        ]
      }
    ]
  }
];

export const mockResultHistory: ResultHistoryItem[] = [
  {
    id: "result-1",
    ownerId: LOCAL_OWNER_ID,
    clientId: "client-1",
    exerciseId: "ex-4",
    exerciseName: "Жим лежа",
    date: "2026-05-07T09:30:00.000Z",
    bestSet: { weightKg: 14, reps: 9 },
    volumeKg: 684,
    deltaLabel: "+2 kg"
  },
  {
    id: "result-2",
    ownerId: LOCAL_OWNER_ID,
    clientId: "client-1",
    exerciseId: "ex-2",
    exerciseName: "Жим от плеч сидя в рычажном тренажере",
    date: "2026-05-07T09:30:00.000Z",
    bestSet: { weightKg: 36, reps: 10 },
    volumeKg: 792
  }
];
