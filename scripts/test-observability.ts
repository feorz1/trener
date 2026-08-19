import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyError, normalizeErrorCode, sanitizeErrorAttributes } from "../src/observability/sanitizeError";

assert.equal(classifyError(Object.assign(new Error("private"), { name: "NetworkTimeoutError" })), "timeout");
assert.equal(classifyError(Object.assign(new Error("private"), { name: "AuthFlowError" })), "auth");
assert.equal(classifyError(new TypeError("private")), "type_error");
assert.equal(classifyError({ message: "person@example.com +7 999 123-45-67" }), "unknown");

const attributes = sanitizeErrorAttributes({
  phase: "cold_start",
  operation: "restore_session",
  source: "secure_store",
  retryable: true,
  statusCode: 503,
  email: "person@example.com",
  phone: "+7 999 123-45-67",
  healthConstraints: ["diabetes"],
  notes: "private coaching note",
  token: "secret",
  message: "person@example.com",
  stack: "private stack",
  arbitrary: "diabetes"
});
assert.deepEqual(attributes, {
  phase: "cold_start",
  operation: "restore_session",
  source: "secure_store",
  retryable: true,
  statusCode: 503
});
const serialized = JSON.stringify(attributes);
for (const privateValue of ["person@example.com", "+7 999", "diabetes", "private", "secret"]) {
  assert.doesNotMatch(serialized, new RegExp(privateValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

assert.equal(normalizeErrorCode(" ROOT_RENDER_FAILED "), "root_render_failed");
assert.equal(normalizeErrorCode("user@example.com"), "invalid_error_code");

const rootLayout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
const dataProvider = readFileSync(new URL("../src/data/DataProvider.tsx", import.meta.url), "utf8");
const consoleEmailSender = readFileSync(new URL("../server/src/email.ts", import.meta.url), "utf8");
const serverIndex = readFileSync(new URL("../server/src/index.ts", import.meta.url), "utf8");
assert.match(rootLayout, /reportAppError\(\{[\s\S]*code: "root_render_failed"/);
assert.match(dataProvider, /code: "remote_bootstrap_failed"/);
assert.match(dataProvider, /code: "local_hydration_failed"/);
assert.doesNotMatch(dataProvider, /console\.warn\("(?:Remote data bootstrap|Local data hydration)/);
assert.doesNotMatch(consoleEmailSender, /console\.(?:log|info|warn|error)\([^)]*(?:params\.(?:email|code)|\$\{params\.(?:email|code)\})/);
assert.doesNotMatch(serverIndex, /console\.error\(error\)/);

console.info("Observability and PII-redaction checks passed.");
