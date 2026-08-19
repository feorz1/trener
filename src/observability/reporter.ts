import { classifyError, normalizeErrorCode, sanitizeErrorAttributes } from "./sanitizeError";
import { getReleaseMetadata } from "./releaseMetadata";
import type { AppErrorReporter, ReportAppErrorInput, SanitizedAppErrorEvent } from "./types";

const noopReporter: AppErrorReporter = { capture() {} };
let activeReporter = noopReporter;

export function registerAppErrorReporter(reporter: AppErrorReporter) {
  const previous = activeReporter;
  activeReporter = reporter;
  return () => {
    if (activeReporter === reporter) activeReporter = previous;
  };
}

export function createSanitizedAppErrorEvent(input: ReportAppErrorInput): SanitizedAppErrorEvent {
  return {
    category: input.category,
    code: normalizeErrorCode(input.code),
    kind: classifyError(input.error),
    fatal: input.fatal ?? false,
    occurredAt: new Date().toISOString(),
    release: getReleaseMetadata(),
    attributes: sanitizeErrorAttributes(input.attributes)
  };
}

export function reportAppError(input: ReportAppErrorInput) {
  const event = createSanitizedAppErrorEvent(input);
  try {
    void Promise.resolve(activeReporter.capture(event)).catch(() => undefined);
  } catch {
    // Observability must never become a new application failure mode.
  }
}
