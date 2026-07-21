import assert from "node:assert/strict";
import { bootstrapPayloadToState, fetchBootstrapState } from "../src/data/remote/bootstrap";
import { NetworkTimeoutError } from "../src/utils/networkTimeout";

const state = bootstrapPayloadToState(
  {
    clients: [
      {
        id: "client-a",
        name: "Client A",
        email: "client@example.com",
        status: "active",
        profile: {
          telegram: "@client_a",
          gender: "female",
          goal: "Поддержать форму",
          restrictions: ["Без осевых нагрузок"],
          metrics: { weightKg: 64, heightCm: 170, attendanceRate: 92 },
          intake: {
            ageYears: 31,
            targetWeightKg: 60,
            healthConstraints: ["Травмы спины"],
            exerciseRestrictions: ["Без осевых нагрузок"],
            activityLevel: "Активная",
            sleep: "6-8 часов",
            workoutsPerWeek: 3,
            trainingExperience: "Занимаюсь регулярно",
            sports: ["Футбол"]
          }
        },
        createdAt: "2026-07-05T10:00:00.000Z",
        updatedAt: "2026-07-05T10:00:00.000Z"
      }
    ],
    exercises: [
      {
        id: "exercise-system",
        trainerId: null,
        name: "System Squat",
        muscleGroup: "legs",
        equipment: "barbell",
        isSystem: true
      },
      {
        id: "exercise-pike",
        trainerId: null,
        name: "Отжимания уголком",
        muscleGroup: "shoulders",
        equipment: "bodyweight",
        isSystem: true
      },
      {
        id: "assisted-pull-up-machine",
        trainerId: null,
        name: "Подтягивания в гравитроне",
        muscleGroup: "back",
        equipment: "gravitron",
        isSystem: true
      },
      {
        id: "exercise-custom",
        trainerId: "user-a",
        name: "Custom Press",
        muscleGroup: "chest",
        isSystem: false
      }
    ],
    workoutSessions: [
      {
        id: "session-planned",
        clientId: "client-a",
        title: "Planned Strength",
        status: "planned",
        scheduledAt: "2026-07-06T11:00:00.000Z",
        items: [
          {
            id: "session-item-without-sets",
            exerciseId: "exercise-system",
            order: 1,
            titleSnapshot: "System Squat",
            plannedSets: null,
            plannedReps: null,
            plannedWeight: null,
            plannedDurationSec: null,
            setResults: []
          },
          {
            id: "session-item-with-legacy-target",
            exerciseId: "exercise-pike",
            order: 2,
            titleSnapshot: "Отжимания уголком",
            plannedSets: null,
            plannedReps: 10,
            setResults: []
          }
        ]
      },
      {
        id: "session-a",
        clientId: "client-a",
        title: "Strength",
        status: "completed",
        scheduledAt: "2026-07-05T11:00:00.000Z",
        startedAt: "2026-07-05T11:05:00.000Z",
        finishedAt: "2026-07-05T12:00:00.000Z",
        items: [
          {
            id: "session-item-a",
            exerciseId: "exercise-custom",
            order: 1,
            titleSnapshot: "Custom Press",
            plannedSets: 1,
            plannedReps: 8,
            plannedWeight: 60,
            setResults: [
              { id: "result-a-old", setNumber: 1, reps: 6, weight: 55, completed: false },
              { id: "result-a", setNumber: 1, reps: 8, weight: 60, completed: true },
              { id: "result-b", setNumber: 2, reps: 7, weight: 62.5, completed: false }
            ]
          },
          {
            id: "session-item-assisted-pull-up",
            exerciseId: "assisted-pull-up-machine",
            order: 3,
            titleSnapshot: "Подтягивания в гравитроне",
            plannedSets: 1,
            plannedReps: 6,
            plannedWeight: 15,
            setResults: [
              { id: "result-assisted-pull-up", setNumber: 1, reps: 6, weight: 15, completed: true }
            ]
          },
          {
            id: "session-item-pike",
            exerciseId: "exercise-pike",
            order: 2,
            titleSnapshot: "Отжимания уголком",
            plannedSets: 1,
            plannedReps: 12,
            setResults: [
              { id: "result-pike", setNumber: 1, reps: 12, completed: true }
            ]
          }
        ]
      }
    ]
  },
  "user-a"
);

assert.deepEqual(state.clientIds, ["client-a"]);
assert.equal(state.clientsById["client-a"].ownerId, "user-a");
assert.equal(state.clientsById["client-a"].telegram, "@client_a");
assert.equal(state.clientsById["client-a"].gender, "female");
assert.equal(state.clientsById["client-a"].goal, "Поддержать форму");
assert.deepEqual(state.clientsById["client-a"].restrictions, ["Без осевых нагрузок"]);
assert.deepEqual(state.clientsById["client-a"].metrics, { weightKg: 64, heightCm: 170, attendanceRate: 92 });
assert.deepEqual(state.clientsById["client-a"].intake, {
  ageYears: 31,
  targetWeightKg: 60,
  healthConstraints: ["Травмы спины"],
  exerciseRestrictions: ["Без осевых нагрузок"],
  activityLevel: "Активная",
  sleep: "6-8 часов",
  workoutsPerWeek: 3,
  trainingExperience: "Занимаюсь регулярно",
  sports: ["Футбол"]
});
assert.equal(state.exercisesById["exercise-system"].ownerId, "user-a");
assert.equal(state.exercisesById["exercise-system"].source, "built_in");
assert.equal(state.exercisesById["exercise-pike"].resultType, "reps_only");
assert.equal(state.exercisesById["assisted-pull-up-machine"].resultType, "assisted_bodyweight");
assert.equal(state.exercisesById["exercise-custom"].source, "custom");
assert.deepEqual(state.workoutIds, ["session-planned", "session-a"]);
assert.equal(state.workoutsById["session-planned"].status, "planned");
assert.equal(state.workoutsById["session-planned"].exercises[0].sets.length, 0);
assert.equal(state.workoutsById["session-planned"].exercises[1].sets.length, 1);
assert.equal(state.workoutsById["session-planned"].exercises[1].sets[0].targetReps, 10);
assert.equal(state.workoutsById["session-a"].ownerId, "user-a");
assert.equal(state.workoutsById["session-a"].status, "completed");
assert.deepEqual(state.sessionIds, ["session-a"]);
assert.equal(state.sessionsById["session-a"].status, "completed");
assert.deepEqual(state.workoutsById["session-a"].exercises[0].sets.map((set) => set.id), ["result-a", "result-b"]);
const pikeWorkoutExercise = state.workoutsById["session-a"].exercises.find((exercise) => exercise.exerciseId === "exercise-pike");
const assistedWorkoutExercise = state.workoutsById["session-a"].exercises.find((exercise) => exercise.exerciseId === "assisted-pull-up-machine");
const pikeSessionExercise = state.sessionsById["session-a"].exercises.find((exercise) => exercise.exerciseId === "exercise-pike");
const assistedSessionExercise = state.sessionsById["session-a"].exercises.find((exercise) => exercise.exerciseId === "assisted-pull-up-machine");
assert.equal(pikeWorkoutExercise?.resultType, "reps_only");
assert.equal(assistedWorkoutExercise?.resultType, "assisted_bodyweight");
assert.equal(assistedWorkoutExercise?.sets[0].values?.assistance, 15);
assert.equal(pikeSessionExercise?.resultTypeSnapshot, "reps_only");
assert.equal(assistedSessionExercise?.resultTypeSnapshot, "assisted_bodyweight");
assert.deepEqual(state.resultIds, ["result-a", "result-b", "result-assisted-pull-up", "result-pike"]);
assert.equal(state.resultsById["result-a"].ownerId, "user-a");
assert.equal(state.resultsById["result-a"].repetitions, 8);
assert.equal(state.resultsById["result-a-old"], undefined);
assert.equal(state.resultsById["result-b"].setIndex, 2);
assert.equal(state.resultsById["result-pike"].resultType, "reps_only");
assert.equal(state.resultsById["result-assisted-pull-up"].resultType, "assisted_bodyweight");
assert.equal(state.resultsById["result-assisted-pull-up"].values?.assistance, 15);

const otherState = bootstrapPayloadToState({ clients: [{ id: "client-b", name: "Client B" }] }, "user-b");
assert.equal(otherState.clientsById["client-b"].ownerId, "user-b");
assert.equal(otherState.clientIds.includes("client-a"), false);
assert.equal(otherState.clientsById["client-b"].goal, "Новая цель");
assert.deepEqual(otherState.clientsById["client-b"].metrics, { weightKg: 0, heightCm: 0, attendanceRate: 100 });
assert.equal(otherState.clientsById["client-b"].intake, undefined);

async function testNeverResolvingBootstrap() {
  let requestSignal: AbortSignal | null | undefined;
  const neverResolvingFetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    requestSignal = init?.signal;
    return new Promise<Response>(() => undefined);
  });

  await assert.rejects(
    withWatchdog(
      fetchBootstrapState({
        baseUrl: "https://example.com",
        authorizedFetch: neverResolvingFetch,
        ownerId: "user-a",
        timeoutMs: 15
      })
    ),
    (error: unknown) => error instanceof NetworkTimeoutError
  );
  assert.equal(requestSignal?.aborted, true);
}

function withWatchdog<T>(promise: Promise<T>, timeoutMs = 250): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const watchdog = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Bootstrap timeout regression test did not settle")), timeoutMs);
  });
  return Promise.race([promise, watchdog]).finally(() => clearTimeout(timeoutId));
}

void testNeverResolvingBootstrap()
  .then(() => console.log("Sync bootstrap tests passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
