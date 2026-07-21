import assert from "node:assert/strict";
import { buildScheduleDraftPatch, normalizeEditDraftSchedule } from "../src/features/workouts/scheduleDraft";

const selectedDate = new Date(2026, 6, 3, 12, 0, 0, 0);
const selectedDays = ["monday", "thursday", "saturday"] as const;

const patchBeforeSlotSelection = buildScheduleDraftPatch({
  selectedDate,
  selectedDays: [...selectedDays],
  scheduleTimes: {
    monday: "17:00"
  }
});

assert.deepEqual(patchBeforeSlotSelection.repeatDays, ["monday", "thursday", "saturday"]);
assert.deepEqual(patchBeforeSlotSelection.scheduleTimes, {
  monday: "17:00",
  thursday: "17:00",
  saturday: "17:00"
});
assert.equal(patchBeforeSlotSelection.startsAt, new Date(2026, 6, 3, 17, 0, 0, 0).toISOString());

const patchAfterSlotSelection = buildScheduleDraftPatch({
  selectedDate,
  selectedDays: [...selectedDays],
  scheduleTimes: {
    monday: "18:00",
    thursday: "17:00",
    saturday: "17:00"
  }
});

assert.deepEqual(patchAfterSlotSelection.repeatDays, ["monday", "thursday", "saturday"]);
assert.equal(patchAfterSlotSelection.scheduleTimes.monday, "18:00");
assert.equal(patchAfterSlotSelection.startsAt, new Date(2026, 6, 3, 18, 0, 0, 0).toISOString());

const remoteWorkoutStart = new Date(2026, 6, 18, 21, 5, 0, 0).toISOString();
const productionShapedEditDraft = {
  startsAt: remoteWorkoutStart,
  exercises: [{ id: "first" }, { id: "second" }]
};
const normalizedEditDraft = normalizeEditDraftSchedule(productionShapedEditDraft);

assert.deepEqual(normalizedEditDraft.repeatDays, ["saturday"]);
assert.deepEqual(normalizedEditDraft.scheduleTimes, { saturday: "21:05" });
assert.deepEqual(normalizedEditDraft.exercises, [
  { id: "first", day: "saturday" },
  { id: "second", day: "saturday" }
]);
assert.equal(normalizeEditDraftSchedule(normalizedEditDraft), normalizedEditDraft, "normalized edit drafts should be stable");

const staleExistingDraft = normalizeEditDraftSchedule({
  startsAt: remoteWorkoutStart,
  repeatDays: ["monday"],
  scheduleTimes: { monday: "18:00" },
  exercises: [{ id: "existing", day: "tuesday" as const }, { id: "legacy" }]
});

assert.deepEqual(staleExistingDraft.repeatDays, ["monday"], "an explicit edit scope must be preserved");
assert.deepEqual(staleExistingDraft.scheduleTimes, { monday: "18:00" }, "an explicitly edited time must be preserved");
assert.deepEqual(staleExistingDraft.exercises, [
  { id: "existing", day: "tuesday" },
  { id: "legacy", day: "monday" }
]);

console.log("Schedule draft tests passed.");
