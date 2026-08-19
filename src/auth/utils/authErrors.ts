import type { AuthError, AuthErrorCode } from "../types";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  network_error: "Проверьте интернет и попробуйте ещё раз",
  invalid_email: "Введите почту в формате name@example.com",
  invalid_code: "Неверный код",
  code_expired: "Код устарел, запросите новый",
  too_many_attempts: "Слишком много попыток, попробуйте позже",
  resend_too_soon: "Код уже отправлен. Попробуйте чуть позже",
  session_expired: "Сессия истекла. Войдите снова",
  invalid_refresh_token: "Сессия истекла. Войдите снова",
  provider_disabled: "Этот способ входа временно недоступен",
  server_error: "Что-то пошло не так. Попробуйте позже",
  unknown: "Что-то пошло не так. Попробуйте ещё раз"
};

export class AuthFlowError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message = AUTH_ERROR_MESSAGES[code],
    options: { cause?: unknown } = {}
  ) {
    super(message);
    this.name = "AuthFlowError";
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function createAuthError(code: AuthErrorCode, message = AUTH_ERROR_MESSAGES[code]): AuthError {
  return { code, message };
}

export function normalizeAuthError(error: unknown, fallbackCode: AuthErrorCode = "unknown"): AuthError {
  if (error instanceof AuthFlowError) {
    return createAuthError(error.code, error.message);
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (isAuthErrorCode(code)) {
      return createAuthError(code, (error as { message?: string }).message || AUTH_ERROR_MESSAGES[code]);
    }
  }
  if (error instanceof TypeError) {
    return createAuthError("network_error");
  }
  return createAuthError(fallbackCode);
}

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === "string" && value in AUTH_ERROR_MESSAGES;
}
