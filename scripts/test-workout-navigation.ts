import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const scheduleSource = readFileSync("app/workouts/schedule.tsx", "utf8");
const newWorkoutSource = readFileSync("app/workouts/new.tsx", "utf8");
const exerciseSelectionSource = readFileSync("app/workouts/exercises.tsx", "utf8");
const newExerciseSource = readFileSync("app/workouts/exercise-new.tsx", "utf8");
const layoutSource = readFileSync("app/_layout.tsx", "utf8");

assert.equal(existsSync("app/workouts/day-edit.tsx"), false, "day-edit modal route should be removed");
assert.equal(layoutSource.includes("workouts/day-edit"), false, "day-edit should not be registered in the root stack");
assert.equal(newWorkoutSource.includes('pathname: "/workouts/day-edit"'), false, "new workout edit button should not open day-edit");
assert.ok(newWorkoutSource.includes('pathname: "/workouts/schedule"'), "new workout edit button should open schedule");
assert.ok(newWorkoutSource.includes('returnTo: "workout-new"'), "schedule edit should return to the existing workout draft screen");
assert.ok(scheduleSource.includes("router.push(route);"), "initial schedule continue should keep schedule behind workout-new for back navigation");
assert.ok(scheduleSource.includes("router.dismissTo(route);"), "schedule edit continue should return to the existing workout-new screen");
assert.ok(exerciseSelectionSource.includes("const saveSelectionMutation = useDataMutation"), "exercise selection save should use the shared mutation guard");
assert.ok(exerciseSelectionSource.includes("saveSelectionMutation.mutate().catch(() => undefined)"), "exercise selection save should handle rejected promises");
assert.ok(exerciseSelectionSource.includes('saveSelectionMutation.isSubmitting ? "loading"'), "exercise selection save should block repeated taps while submitting");
assert.ok(exerciseSelectionSource.includes("saveSelectionMutation.error.message"), "exercise selection should render the API error instead of opening the red error overlay");
assert.ok(newExerciseSource.includes("const [nameTouched, setNameTouched] = useState(false)"), "new exercise validation should track interaction");
assert.ok(newExerciseSource.includes("const showNameError = nameTouched && !name.trim()"), "new exercise name should only show an error after interaction");
assert.ok(newExerciseSource.includes('state={showNameError ? "error" : name.trim() ? "default" : "empty"}'), "untouched empty exercise name should render as empty, not error");
assert.ok(newExerciseSource.includes("showMessage={showNameError}"), "the required-name message should stay hidden before interaction");
assert.equal(newExerciseSource.includes('state={!name.trim() ? "error" : "default"}'), false, "unconditional initial name error must not return");

console.log("Workout navigation tests passed.");
