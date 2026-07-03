import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};
const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
const buildCheckScript = packageJson.scripts?.["build:check"] ?? "";

assert.match(buildCheckScript, /\bexpo export\b/, "build:check must run Expo export.");
assert.match(buildCheckScript, /--output-dir\s+\.expo-export-check\b/, "build:check must write only to .expo-export-check.");
assert.match(buildCheckScript, /\s--clear\b/, "build:check must clear stale export output before each run.");
assert.match(gitignore, /^\.expo-export-check\/$/m, ".expo-export-check/ must be listed as ignored generated output.");

for (const ignoredPath of [".expo-export-check/", ".expo-export-check/index.html"]) {
  try {
    execFileSync("git", ["check-ignore", "--quiet", ignoredPath], { cwd: root, stdio: "pipe" });
  } catch {
    throw new Error(`${ignoredPath} must be ignored so npm run check leaves no untracked export output.`);
  }
}

console.log("Generated output policy tests passed.");
