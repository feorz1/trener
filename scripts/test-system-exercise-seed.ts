import assert from "node:assert/strict";
import { buildSystemExerciseSeedRows } from "../server/src/seeds/systemExercises";

const rows = buildSystemExerciseSeedRows();
const keys = new Set(rows.map((row) => row.systemKey));
const names = new Set(rows.map((row) => row.name.toLocaleLowerCase("ru-RU")));

assert.ok(rows.length >= 200, `expected at least 200 system exercises, got ${rows.length}`);
assert.equal(keys.size, rows.length, "system exercise seed keys must be unique");
assert.equal(names.size, rows.length, "system exercise names must be unique");
assert.ok(rows.every((row) => row.systemKey.startsWith("local:")), "system exercise seed keys must be stable local catalog keys");
assert.ok(rows.every((row) => row.name.length > 0), "system exercise names are required");

console.log(`System exercise seed tests passed: ${rows.length} exercises.`);
