import type { AuthErrorCode } from "./types";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  network_error: "Проверьте интернет и попробуйте ещё раз",
  invalid_email: "Введите почту в формате name@example.com",
  invalid_code: "Неверный код",
  code_expired: "Код устарел, запросите новый",
  too_many_attempts: "Слишком много попыток, попробуйте позже",
  resend_too_soon: "Код уже отправлен. Попробуйте чуть позже",
  oauth_cancelled: "Вход отменён",
  oauth_failed: "Не получилось войти через этот сервис",
  account_conflict: "Этот способ входа уже связан с другим аккаунтом",
  session_expired: "Сессия истекла. Войдите снова",
  invalid_refresh_token: "Сессия истекла. Войдите снова",
  invalid_ticket: "Ссылка для входа недействительна",
  ticket_expired: "Ссылка для входа устарела",
  ticket_already_used: "Ссылка для входа уже использована",
  provider_disabled: "Этот способ входа временно недоступен",
  validation: "Проверьте данные и попробуйте ещё раз",
  not_found: "Запись не найдена",
  forbidden: "Нет доступа к этой записи",
  conflict: "Данные уже изменились на другом устройстве",
  server_error: "Что-то пошло не так. Попробуйте позже",
  unknown: "Что-то пошло не так. Попробуйте ещё раз"
};

export class AuthApiError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    public readonly statusCode = 400,
    message = AUTH_ERROR_MESSAGES[code]
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export function toErrorPayload(error: AuthApiError) {
  return {
    code: error.code,
    message: error.message
  };
}
