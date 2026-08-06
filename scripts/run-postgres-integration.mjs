#!/usr/bin/env node

import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_ACK = "DELETE_DISPOSABLE_DATABASE";
const TEST_SENTINEL = "RUN_DISPOSABLE_POSTGRES_INTEGRATION";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function block(reason) {
  throw new Error(`[postgres-integration] blocked: ${reason}`);
}

function parsePostgresUrl(raw, variableName) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    block(`${variableName} must be a valid PostgreSQL URL`);
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    block(`${variableName} must use postgres:// or postgresql://`);
  }
  const targetParameters = new Set(["host", "hostaddr", "port", "dbname", "service", "servicefile"]);
  for (const parameter of parsed.searchParams.keys()) {
    if (targetParameters.has(parameter.toLowerCase())) {
      block(`${variableName} must not override its connection target through query parameters`);
    }
  }
  if (parsed.hash) block(`${variableName} must not contain a fragment`);
  if (!parsed.hostname || !/^[a-z0-9.-]+$/i.test(parsed.hostname)) {
    block(`${variableName} must contain a conventional hostname`);
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!databaseName || databaseName.includes("/") || !/^[a-z0-9_-]+$/i.test(databaseName)) {
    block(`${variableName} must name one database using letters, numbers, underscore, or hyphen`);
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  if (!hostname) block(`${variableName} must contain a hostname after normalization`);
  return { parsed, databaseName, hostname };
}

function validateTarget() {
  if (process.env.NODE_ENV?.toLowerCase() === "production") {
    block("NODE_ENV=production is forbidden");
  }
  if (process.env.ACCOUNT_DELETION_TEST_DB_ACK !== REQUIRED_ACK) {
    block(`ACCOUNT_DELETION_TEST_DB_ACK must equal ${REQUIRED_ACK}`);
  }
  for (const variableName of ["PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE"]) {
    if (process.env[variableName]) block(`${variableName} must be unset for destructive PostgreSQL integration tests`);
  }

  const rawTestUrl = process.env.TEST_DATABASE_URL;
  if (!rawTestUrl) block("TEST_DATABASE_URL is required; DATABASE_URL is never used as a fallback");
  const target = parsePostgresUrl(rawTestUrl, "TEST_DATABASE_URL");
  const host = target.hostname;
  const databaseName = target.databaseName.toLowerCase();

  if (!/(test|disposable)/i.test(databaseName)) {
    block("database name must include test or disposable");
  }
  if (
    host.includes("prod") ||
    databaseName.includes("prod") ||
    host === "trener-app.com" ||
    host.endsWith(".trener-app.com")
  ) {
    block("production-like hosts and database names are forbidden");
  }

  if (process.env.DATABASE_URL) block("DATABASE_URL must be unset for destructive PostgreSQL integration tests");

  return target;
}

async function runNodeCli(entrypoint, args, childEnv) {
  await access(entrypoint);
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [entrypoint, ...args], {
      cwd: projectRoot,
      env: childEnv,
      stdio: "inherit",
      shell: false
    });
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`child process failed (${signal ? `signal ${signal}` : `exit ${code ?? "unknown"}`})`));
    });
  });
}

async function main() {
  const target = validateTarget();
  console.info(`[postgres-integration] disposable target host=${target.hostname} database=${target.databaseName}`);

  const childEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    POSTGRES_INTEGRATION_SENTINEL: TEST_SENTINEL
  };
  const prismaCli = resolve(projectRoot, "node_modules/prisma/build/index.js");
  const vitestCli = resolve(projectRoot, "node_modules/vitest/vitest.mjs");

  await runNodeCli(
    prismaCli,
    ["migrate", "reset", "--force", "--skip-seed", "--schema", "server/prisma/schema.prisma"],
    childEnv
  );
  await runNodeCli(vitestCli, ["run", "server/test/postgres.integration.test.ts", "--no-file-parallelism"], childEnv);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown failure";
  console.error(message.startsWith("[postgres-integration]") ? message : `[postgres-integration] ${message}`);
  process.exitCode = 1;
});
