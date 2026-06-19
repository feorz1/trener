import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = execFileSync("rg", ["--files", "app", "src"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const violations: string[] = [];

for (const file of files) {
  const absolutePath = join(root, file);
  const source = readFileSync(absolutePath, "utf8");
  const normalized = relative(root, absolutePath);
  const isPersistence = normalized.startsWith("src/data/persistence/");

  if (!isPersistence && source.includes("@react-native-async-storage/async-storage")) {
    violations.push(`${normalized}: AsyncStorage import is only allowed in src/data/persistence`);
  }

  if (normalized.startsWith("app/workouts/") && (source.includes("JSON.parse") || source.includes("JSON.stringify"))) {
    violations.push(`${normalized}: workout planning routes must not serialize domain data through JSON params`);
  }

  if (normalized.startsWith("app/workouts/") && /dayExerciseIds|approachData|supersetConnectionIds/.test(source)) {
    violations.push(`${normalized}: legacy workout draft route params are not allowed`);
  }
}

if (violations.length > 0) {
  console.error("Architecture lint failed:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log("Architecture lint passed.");
