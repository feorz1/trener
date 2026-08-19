import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { mergeSessionExercises, type SessionExercise } from "../src/features/workouts/sessionExerciseMerge";

type Scope = Record<string, unknown>;

function readSource(relativePath: string, kind: ts.ScriptKind) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  const text = readFileSync(path, "utf8");
  return { path, sourceFile: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind) };
}

function compileFunction(source: string, scope: Scope) {
  const compiled = ts.transpileModule(`const __subject = ${source};`, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const names = Object.keys(scope);
  return new Function(...names, `${compiled}; return __subject;`)(...names.map((name) => scope[name]));
}

function findResultRemoveMethod() {
  const { sourceFile } = readSource("../src/data/DataProvider.tsx", ts.ScriptKind.TSX);
  let method: ts.MethodDeclaration | undefined;

  function visit(node: ts.Node) {
    if (
      ts.isMethodDeclaration(node) &&
      node.name.getText(sourceFile) === "remove" &&
      node.body?.getText(sourceFile).includes('type: "result/remove"')
    ) {
      method = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!method?.body) throw new Error("DataProvider results.remove production method was not found");
  const parameters = method.parameters.map((parameter) => parameter.getText(sourceFile)).join(", ");
  return `async (${parameters}) => ${method.body.getText(sourceFile)}`;
}

function findScreenCallback(variableName: string) {
  const { sourceFile } = readSource("../app/sessions/[sessionId]/index.tsx", ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      callback = node.initializer.arguments[0];
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!callback) throw new Error(`WorkoutSessionScreen ${variableName} production callback was not found`);
  return callback.getText(sourceFile);
}

function findScreenVariableInitializer(variableName: string) {
  const { sourceFile } = readSource("../app/sessions/[sessionId]/index.tsx", ts.ScriptKind.TSX);
  let initializer: ts.Expression | undefined;

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === variableName &&
      node.initializer
    ) {
      initializer = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!initializer) throw new Error(`WorkoutSessionScreen ${variableName} production initializer was not found`);
  return initializer.getText(sourceFile);
}

function makeDurationExercise(durations: Array<number | undefined>): SessionExercise {
  return {
    id: "session-item-1",
    exerciseId: "exercise-1",
    exerciseName: "Растяжка",
    resultType: "duration",
    sets: durations.map((duration, index) => ({
      id: `set-${index + 1}`,
      index: index + 1,
      resultType: "duration",
      values: duration === undefined ? undefined : { duration },
      durationSeconds: duration,
      unit: "сек",
      state: duration === undefined ? "default" : "selected",
      logged: duration !== undefined
    }))
  };
}

describe("training screen persistence regressions", () => {
  it("removes a set result from remote persistence before reload", async () => {
    const remoteResults = [{ id: "result-1", ownerId: "trainer-a", sessionId: "session-1", exerciseId: "exercise-1", setIndex: 1, completed: false }];
    const stateRef = {
      current: {
        resultsById: { "result-1": remoteResults[0] },
        resultIds: ["result-1"],
        sessionsById: {
          "session-1": {
            id: "session-1",
            ownerId: "trainer-a",
            exercises: [{ id: "session-item-1", exerciseId: "exercise-1" }]
          }
        }
      }
    };
    const commitActions = async (actions: Array<{ type: string; resultId: string }>) => {
      for (const action of actions) {
        if (action.type !== "result/remove") continue;
        delete stateRef.current.resultsById[action.resultId as "result-1"];
        stateRef.current.resultIds = stateRef.current.resultIds.filter((id) => id !== action.resultId);
      }
    };
    class DataNotFoundError extends Error {}
    class DataError extends Error {}
    const dataApi = {
      async upsertWorkoutSessionResults(_sessionId: string, input: { items: Array<{ setResults: typeof remoteResults }> }) {
        remoteResults.splice(0, remoteResults.length, ...input.items.flatMap((item) => item.setResults));
        return { id: "session-1", items: [] };
      }
    };
    const remove = compileFunction(findResultRemoveMethod(), {
      stateRef,
      currentOwnerId: "trainer-a",
      isOwned: (value: { ownerId?: string } | undefined, ownerId: string) => value?.ownerId === ownerId,
      DataNotFoundError,
      DataError,
      dataApi,
      sessionWriteQueueRef: { current: { enqueue: async (_sessionId: string, operation: () => Promise<void>) => operation() } },
      ensureOwned: (value: unknown) => value,
      toRemoteSetResult: (result: unknown) => result,
      remoteSessionActions: () => [],
      commitActions
    }) as (resultId: string) => Promise<void>;

    await remove("result-1");
    expect(stateRef.current.resultIds).toEqual([]);

    const resultsAfterReload = remoteResults;
    expect(resultsAfterReload).toEqual([]);
  });

  it("persists a saved exercise note before reopening the session", async () => {
    let screenExercises = [{ id: "session-item-1", comment: "Старая заметка" }];
    let persistedComment = "Старая заметка";
    const setSessionExercises = (update: (current: typeof screenExercises) => typeof screenExercises) => {
      screenExercises = update(screenExercises);
    };
    const sessionActions = {
      async update(_sessionId: string, patch: { exercises: Array<{ id: string; comment?: string }> }) {
        persistedComment = patch.exercises[0]?.comment ?? "";
      }
    };
    const persistSessionExercisePatch = compileFunction(findScreenCallback("persistSessionExercisePatch"), {
      sessionId: "session-1",
      session: { exercises: [{ id: "session-item-1", comment: "Старая заметка" }] },
      sessionActions
    }) as (exerciseId: string, patch: { comment?: string }) => void;
    const handleNoteChange = compileFunction(findScreenCallback("handleNoteChange"), { setSessionExercises, persistSessionExercisePatch }) as (
      exerciseId: string,
      nextNote: string
    ) => void;

    handleNoteChange("session-item-1", "Новая заметка");
    await Promise.resolve();
    expect(screenExercises[0]?.comment).toBe("Новая заметка");

    const reopenedExercise = { id: "session-item-1", comment: persistedComment };
    expect(reopenedExercise.comment).toBe("Новая заметка");
  });

  it("does not restore a populated last set as a blank row after deletion sync", () => {
    const localAfterDelete = [makeDurationExercise([111, 10, 10])];
    const responseAfterResultRemoval = [makeDurationExercise([111, 10, 10, undefined])];
    const responseAfterPlannedSetCountUpdate = [makeDurationExercise([111, 10, 10])];
    const mergeOptions = {
      deletedSetIndexesByExercise: new Map([["session-item-1", new Set([4])]])
    };

    const afterResultSync = mergeSessionExercises(localAfterDelete, responseAfterResultRemoval, mergeOptions);
    const afterMetadataSync = mergeSessionExercises(afterResultSync, responseAfterPlannedSetCountUpdate, mergeOptions);

    expect(afterMetadataSync[0]?.sets.map((set) => set.index)).toEqual([1, 2, 3]);

    const localWithReplacementSet = [makeDurationExercise([111, 10, 10, 25])];
    const staleResponseForDeletedSet = [makeDurationExercise([111, 10, 10, undefined])];
    const whileReplacementSaves = mergeSessionExercises(localWithReplacementSet, staleResponseForDeletedSet, mergeOptions);
    expect(whileReplacementSaves[0]?.sets[3]?.values?.duration).toBe(25);
  });

  it("uses the reduced active-session set count instead of restoring the workout-plan row", () => {
    const getPlannedSetCount = compileFunction(
      `(exercise, workoutSets, highestResultSetIndex) => ${findScreenVariableInitializer("plannedSetCount")}`,
      {}
    ) as (
      exercise: { plannedSets?: number },
      workoutSets: unknown[],
      highestResultSetIndex: number
    ) => number;

    expect(getPlannedSetCount({ plannedSets: 2 }, [{}, {}, {}], 2)).toBe(2);
    expect(getPlannedSetCount({}, [{}, {}, {}], 0)).toBe(3);
    expect(getPlannedSetCount({ plannedSets: 2 }, [{}, {}, {}], 4)).toBe(4);
  });

  it("keeps an early-finished timer value visible while its save synchronizes", () => {
    const optimisticTimerValue = [makeDurationExercise([19])];
    const staleIncomingValue = [makeDurationExercise([30])];

    const visibleExercises = mergeSessionExercises(optimisticTimerValue, staleIncomingValue, {
      preserveLocalSetKeys: new Set(["session-item-1:set-1"])
    });

    expect(visibleExercises[0]?.sets[0]?.values?.duration).toBe(19);
  });
});
