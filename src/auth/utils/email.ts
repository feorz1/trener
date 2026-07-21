const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed;

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();
  return `${localPart}@${domain}`;
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_PATTERN.test(normalized)) return false;

  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return domain !== "test-mail.ru";
}
