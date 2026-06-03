import { ResultHistoryItem, Workout } from "@/types";
import { atToday } from "./mockClients";

export const mockWorkouts: Workout[] = [
  {
    id: "workout-1",
    clientId: "client-1",
    title: "Upper body",
    startsAt: atToday(9, 30),
    durationMinutes: 55,
    focus: "Press + stabilization",
    location: "Gym 1",
    status: "planned",
    exercises: [
      {
        id: "we-1",
        exerciseId: "ex-1",
        exerciseName: "Dumbbell bench press",
        muscleGroup: "Chest · triceps",
        comment: "Warm up with 10 kg, do not force working sets.",
        sets: [
          { id: "set-1", order: 1, targetWeightKg: 12, targetReps: 12, completed: false },
          { id: "set-2", order: 2, targetWeightKg: 14, targetReps: 10, completed: false },
          { id: "set-3", order: 3, targetWeightKg: 14, targetReps: 10, completed: false }
        ]
      },
      {
        id: "we-2",
        exerciseId: "ex-2",
        exerciseName: "Lat pulldown",
        muscleGroup: "Back · biceps",
        sets: [
          { id: "set-4", order: 1, targetWeightKg: 32, targetReps: 12, completed: false },
          { id: "set-5", order: 2, targetWeightKg: 36, targetReps: 10, completed: false }
        ]
      }
    ]
  },
  {
    id: "workout-2",
    clientId: "client-2",
    title: "Legs and back",
    startsAt: atToday(12, 0),
    durationMinutes: 60,
    focus: "Volume without failure",
    location: "Gym 2",
    status: "inProgress",
    exercises: [
      {
        id: "we-3",
        exerciseId: "ex-3",
        exerciseName: "Goblet squat",
        muscleGroup: "Quads · glutes",
        sets: [
          { id: "set-6", order: 1, targetWeightKg: 20, targetReps: 12, completed: true },
          { id: "set-7", order: 2, targetWeightKg: 24, targetReps: 10, completed: false }
        ]
      }
    ]
  }
];

export const mockResultHistory: ResultHistoryItem[] = [
  {
    id: "result-1",
    clientId: "client-1",
    exerciseId: "ex-1",
    exerciseName: "Dumbbell bench press",
    date: "2026-05-07T09:30:00.000Z",
    bestSet: { weightKg: 14, reps: 9 },
    volumeKg: 684,
    deltaLabel: "+2 kg"
  },
  {
    id: "result-2",
    clientId: "client-1",
    exerciseId: "ex-2",
    exerciseName: "Lat pulldown",
    date: "2026-05-07T09:30:00.000Z",
    bestSet: { weightKg: 36, reps: 10 },
    volumeKg: 792
  }
];
