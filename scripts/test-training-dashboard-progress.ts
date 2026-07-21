import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const screenPath = fileURLToPath(new URL("../app/(tabs)/index.tsx", import.meta.url));
const sourceText = readFileSync(screenPath, "utf8");
const sourceFile = ts.createSourceFile(screenPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration: ts.FunctionDeclaration | undefined;

function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "getSessionProgress") {
    declaration = node;
    return;
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);
assert.ok(declaration, "getSessionProgress production function should exist");

const compiled = ts.transpileModule(declaration.getText(sourceFile), {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 }
}).outputText;
const getSessionProgress = new Function(`${compiled}; return getSessionProgress;`)() as (
  session: unknown,
  results: unknown[]
) => { completedExercises: number; totalExercises: number };

const progress = getSessionProgress(
  {
    id: "session-active",
    exercises: [
      {
        id: "session-item-1",
        exerciseId: "exercise-1",
        plannedSets: 3
      }
    ]
  },
  [
    {
      id: "result-1",
      sessionId: "session-active",
      sessionExerciseItemId: "session-item-1",
      exerciseId: "exercise-1",
      setIndex: 1,
      completed: true
    }
  ]
);

assert.deepEqual(
  progress,
  { completedExercises: 0, totalExercises: 1 },
  "an exercise with one completed result and two unfinished planned sets must not be shown as completed"
);

console.log("Training dashboard progress regression test passed.");
