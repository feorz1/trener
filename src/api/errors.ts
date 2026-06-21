import { DataError } from "@/data/contracts";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited"
  | "timeout"
  | "cancelled"
  | "network"
  | "server"
  | "unavailable"
  | "idempotency_required"
  | "unknown";

export type ApiErrorDetails = {
  status?: number;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
};

const retryableCodes = new Set<ApiErrorCode>(["rate_limited", "timeout", "network", "server", "unavailable", "unknown"]);

export class ApiError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    options: ApiErrorDetails & { retryable?: boolean; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.retryable = options.retryable ?? retryableCodes.has(code);
    this.status = options.status;
    this.requestId = options.requestId;
    this.fieldErrors = options.fieldErrors;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class ApiCancelledError extends ApiError {
  constructor(message = "API request was cancelled", options: { cause?: unknown } = {}) {
    super("cancelled", message, { retryable: false, cause: options.cause });
    this.name = "ApiCancelledError";
  }
}

export type ApiErrorPayloadDto = {
  code?: string;
  message?: string;
  request_id?: string;
  errors?: Record<string, string[]>;
};

function codeFromStatus(status: number): ApiErrorCode {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limited";
  if (status === 408) return "timeout";
  if (status === 503) return "unavailable";
  if (status >= 500) return "server";
  return "unknown";
}

function isApiErrorCode(value: string | undefined): value is ApiErrorCode {
  return (
    value === "bad_request" ||
    value === "unauthorized" ||
    value === "forbidden" ||
    value === "not_found" ||
    value === "conflict" ||
    value === "validation" ||
    value === "rate_limited" ||
    value === "timeout" ||
    value === "cancelled" ||
    value === "network" ||
    value === "server" ||
    value === "unavailable" ||
    value === "idempotency_required" ||
    value === "unknown"
  );
}

function isAbortLikeError(error: unknown) {
  return Boolean(error && typeof error === "object" && "name" in error && (error as { name?: string }).name === "AbortError");
}

export function createApiErrorFromStatus(status: number, payload: ApiErrorPayloadDto = {}): ApiError {
  const fallbackCode = codeFromStatus(status);
  const code = isApiErrorCode(payload.code) ? payload.code : fallbackCode;
  return new ApiError(code, payload.message ?? `API request failed with status ${status}`, {
    status,
    requestId: payload.request_id,
    fieldErrors: payload.errors
  });
}

export function normalizeApiError(error: unknown, fallbackMessage = "API request failed"): ApiError {
  if (error instanceof ApiError) return error;
  if (isAbortLikeError(error)) return new ApiCancelledError(undefined, { cause: error });
  if (error instanceof Error) {
    return new ApiError("unknown", error.message || fallbackMessage, { cause: error });
  }
  return new ApiError("unknown", fallbackMessage, { cause: error });
}

export function apiErrorToDataError(error: unknown, fallbackMessage = "Data operation failed"): DataError {
  const apiError = normalizeApiError(error, fallbackMessage);
  if (apiError.code === "not_found") return new DataError("not_found", apiError.message, { retryable: false, cause: apiError });
  if (apiError.code === "conflict") return new DataError("active_session_conflict", apiError.message, { retryable: false, cause: apiError });
  if (apiError.code === "validation" || apiError.code === "bad_request" || apiError.code === "idempotency_required") {
    return new DataError("validation", apiError.message, { retryable: false, cause: apiError });
  }
  return new DataError("unknown", apiError.message, { retryable: apiError.retryable, cause: apiError });
}
