import assert from "node:assert/strict";
import {
  getSupersetConnectionIds,
  preserveSupersetConnectionsAfterReorder,
  syncSupersetConnectionsForScope
} from "../src/data/local/supersetConnections";
import type { Workout } from "../src/data/types";

function exercise(id: string, order: number, supersetWithNext = false): Workout["exercises"][number] {
  return {
    id,
    exerciseId: `exercise-${id}`,
    exerciseName: `Exercise ${id}`,
    day: "monday",
    order,
    supersetWithNext,
    sets: [{ id: `set-${id}`, order: 1, targetWeightKg: 100, targetReps: 10, completed: false }]
  };
}

function flags(exercises: Workout["exercises"]) {
  return exercises
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((item) => `${item.id}:${item.supersetWithNext ? "1" : "0"}`);
}

const original = [exercise("a", 1, true), exercise("b", 2, true), exercise("c", 3, false), exercise("d", 4, false)];
const originalConnections = getSupersetConnectionIds(original);

assert.deepEqual(originalConnections, ["a:b", "b:c"]);

const reorderedIds = ["c", "a", "b", "d"];
const reorderedConnections = preserveSupersetConnectionsAfterReorder(["a", "b", "c", "d"], reorderedIds, originalConnections);
assert.deepEqual(reorderedConnections, ["c:a", "a:b"]);

const reordered = syncSupersetConnectionsForScope(
  original.map((item) => ({ ...item, order: reorderedIds.indexOf(item.id) + 1 })),
  "monday",
  reorderedConnections
);
assert.deepEqual(flags(reordered), ["c:1", "a:1", "b:0", "d:0"]);

const removedB = original.filter((item) => item.id !== "b");
const remainingIds = ["a", "c", "d"];
const validAfterRemove = new Set(remainingIds.slice(0, -1).map((id, index) => `${id}:${remainingIds[index + 1]}`));
const connectionsAfterRemove = originalConnections.filter((id) => validAfterRemove.has(id));
const afterRemove = syncSupersetConnectionsForScope(removedB, "monday", connectionsAfterRemove);
assert.deepEqual(flags(afterRemove), ["a:0", "c:0", "d:0"]);

const removedD = original.filter((item) => item.id !== "d");
const idsAfterTailRemove = ["a", "b", "c"];
const validAfterTailRemove = new Set(idsAfterTailRemove.slice(0, -1).map((id, index) => `${id}:${idsAfterTailRemove[index + 1]}`));
const connectionsAfterTailRemove = originalConnections.filter((id) => validAfterTailRemove.has(id));
const afterTailRemove = syncSupersetConnectionsForScope(removedD, "monday", connectionsAfterTailRemove);
assert.deepEqual(flags(afterTailRemove), ["a:1", "b:1", "c:0"]);

console.log("Superset connection tests passed.");

