import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const tsxBin = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const lintScript = join(root, "scripts/lint-architecture.ts");

function runLintWithAppSource(source: string) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "trainer-architecture-lint-"));
  try {
    mkdirSync(join(fixtureRoot, "app"), { recursive: true });
    mkdirSync(join(fixtureRoot, "src"), { recursive: true });
    writeFileSync(join(fixtureRoot, "app/fixture.tsx"), source);
    writeFileSync(join(fixtureRoot, "src/empty.ts"), "export {};\n");

    execFileSync(tsxBin, [lintScript], { cwd: fixtureRoot, encoding: "utf8", stdio: "pipe" });
    return "";
  } catch (error) {
    const result = error as { stdout?: Buffer | string; stderr?: Buffer | string };
    return `${result.stdout?.toString() ?? ""}${result.stderr?.toString() ?? ""}`;
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function assertPasses(name: string, source: string) {
  const output = runLintWithAppSource(source);
  if (output) {
    throw new Error(`${name} should pass architecture lint:\n${output}`);
  }
}

function assertFails(name: string, source: string, expected: string) {
  const output = runLintWithAppSource(source);
  if (!output.includes(expected)) {
    throw new Error(`${name} should fail with "${expected}":\n${output || "lint passed"}`);
  }
}

assertPasses(
  "primitive route params",
  `
    const session = { id: "session-1" };
    const scheduleRepeatDays = ["mon", "wed"];
    const draftIdValue = "draft-1";
    const params = { sessionId: session.id, from: "home" };
    const route = { pathname: "/sessions/[sessionId]", params };
    router.push({ pathname: "/sessions/[sessionId]", params: { sessionId: session.id, from: "home" } });
    router.push(route);
    router.push({ pathname: "/workouts/schedule", params: { scheduleRepeatDays: scheduleRepeatDays.join(",") } });
    router.setParams({ draftId: draftIdValue, activeDay: "mon" });
  `
);

assertFails(
  "domain object route param",
  `
    const client = { id: "client-1", name: "Client" };
    router.push({ pathname: "/clients/[clientId]", params: { client } });
  `,
  "route params must be an object of IDs/primitives"
);

assertFails(
  "callback route param",
  `
    router.push({ pathname: "/workouts/new", params: { onSelect: () => undefined } });
  `,
  "route params must be an object of IDs/primitives"
);

assertFails(
  "shorthand callback params",
  `
    const params = { onSelect: () => undefined };
    router.push({ pathname: "/workouts/new", params });
  `,
  "route params must be an object of IDs/primitives"
);

assertFails(
  "indirect route object callback params",
  `
    const route = { pathname: "/workouts/new", params: { onSelect: () => undefined } };
    router.push(route);
  `,
  "route params must be an object of IDs/primitives"
);

assertFails(
  "array route param",
  `
    const selectedIds = ["exercise-1"];
    router.push({ pathname: "/workouts/schedule", params: { exerciseIds: selectedIds } });
  `,
  "route params must be an object of IDs/primitives"
);

console.log("Architecture lint regression tests passed.");
