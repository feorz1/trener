import assert from "node:assert/strict";
import { bootstrapPayloadToState } from "../src/data/remote/bootstrap";

const state = bootstrapPayloadToState(
  {
    exercises: [
      {
        id: "exercise-triceps-stretch",
        trainerId: "trainer-a",
        name: "Растяжка трицепса над головой",
        muscleGroup: "triceps",
        equipment: null,
        isSystem: false
      }
    ],
    workoutSessions: [
      {
        id: "session-active",
        trainerId: "trainer-a",
        title: "Новая тренировка",
        status: "in_progress",
        startedAt: "2026-07-17T08:00:00.000Z",
        items: [
          {
            id: "session-item-stretch",
            workoutSessionId: "session-active",
            exerciseId: "exercise-triceps-stretch",
            order: 1,
            titleSnapshot: "Растяжка трицепса над головой",
            plannedSets: 2,
            plannedDurationSec: 30,
            setResults: [
              {
                id: "result-set-1",
                workoutSessionItemId: "session-item-stretch",
                setNumber: 1,
                durationSec: 30,
                completed: true
              },
              {
                id: "result-added-set-3",
                workoutSessionItemId: "session-item-stretch",
                setNumber: 3,
                durationSec: 30,
                completed: false
              }
            ]
          }
        ]
      }
    ]
  },
  "trainer-a"
);

const restoredExercise = state.workoutsById["session-active"]?.exercises[0];
assert.ok(restoredExercise, "active workout exercise should be restored");
assert.deepEqual(
  restoredExercise.sets.map((set) => set.order),
  [1, 2, 3],
  "resume must preserve the unlogged planned set between the completed first set and the added third set"
);

console.log("Training session resume regression test passed.");
