import type { AppErrorKind } from "./types";

const SAFE_ATTRIBUTE_KEYS = new Set(["operation", "phase", "platform", "retryable", "source", "statusCode"]);
const SAFE_STRING_VALUE = /^[a-z0-9_.:/-]{1,80}$/i;

export function classifyError(error: unknown): AppErrorKind {
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "ApiCancelledError") return "cancelled";
  if (name === "NetworkTimeoutError") return "timeout";
  if (name === "AuthFlowError") return "auth";
  if (name === "ReleaseLinksConfigurationError") return "configuration";
  if (name === "TypeError") return "type_error";
  if (name === "Error") return "error";
  return "unknown";
}

export function sanitizeErrorAttributes(attributes: Record<string, unknown> | undefined) {
  const safe: Record<string, string | number | boolean> = {};
  if (!attributes) return safe;

  for (const [key, value] of Object.entries(attributes)) {
    if (!SAFE_ATTRIBUTE_KEYS.has(key)) continue;
    if (typeof value === "boolean") {
      safe[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === "string" && SAFE_STRING_VALUE.test(value)) {
      safe[key] = value;
    }
  }
  return safe;
}

export function normalizeErrorCode(code: string) {
  const normalized = code.trim().toLowerCase();
  return /^[a-z0-9_.-]{1,64}$/.test(normalized) ? normalized : "invalid_error_code";
}
