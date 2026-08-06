import { isIP } from "node:net";
import type { OAuthProvider } from "./types";

export type AuthServerConfig = ReturnType<typeof loadAuthConfig>;
export type EmailSenderKind = "console" | "smtp" | "resend";

const MAX_TRUSTED_PROXY_CIDRS = 16;

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

function readInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readList(value: string | undefined, fallback: string[] = []) {
  if (!value) return fallback;
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readEmailSenderKind(value: string | undefined): EmailSenderKind {
  const kind = value ?? "console";
  if (kind === "console" || kind === "smtp" || kind === "resend") return kind;
  throw new Error("EMAIL_SENDER must be one of: console, smtp, resend");
}

function readEmailCodeLength(value: string | undefined) {
  if (value !== undefined && value !== "6") {
    throw new Error("EMAIL_CODE_LENGTH must be exactly 6");
  }
  return 6;
}

function readAccountDeletionReceiptTtlHours(value: string | undefined) {
  if (value !== undefined && !/^[1-9]\d*$/.test(value)) {
    throw new Error("ACCOUNT_DELETION_RECEIPT_TTL_HOURS must be an integer from 1 to 168");
  }
  const hours = value === undefined ? 24 : Number(value);
  if (hours < 1 || hours > 168) {
    throw new Error("ACCOUNT_DELETION_RECEIPT_TTL_HOURS must be an integer from 1 to 168");
  }
  return hours;
}

function readTrustedProxyCidrs(value: string | undefined) {
  const cidrs = readList(value);
  if (cidrs.length > MAX_TRUSTED_PROXY_CIDRS) {
    throw new Error(`TRUSTED_PROXY_CIDRS must contain at most ${MAX_TRUSTED_PROXY_CIDRS} entries`);
  }
  for (const cidr of cidrs) {
    const parts = cidr.split("/");
    if (parts.length > 2) throw invalidTrustedProxyCidr();
    const [address, prefixText] = parts;
    const version = isIP(address);
    if (version === 0) throw invalidTrustedProxyCidr();
    if (prefixText === undefined) continue;
    if (!/^(0|[1-9]\d*)$/.test(prefixText)) throw invalidTrustedProxyCidr();
    const prefix = Number(prefixText);
    const maxPrefix = version === 4 ? 32 : 128;
    if (prefix < 1 || prefix > maxPrefix) throw invalidTrustedProxyCidr();
  }
  return cidrs;
}

function invalidTrustedProxyCidr() {
  return new Error("TRUSTED_PROXY_CIDRS must contain explicit IP addresses or bounded CIDRs; /0 is forbidden");
}

function readAdminOrigin(value: string | undefined) {
  const raw = value || "http://localhost:5173";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("ADMIN_CORS_ORIGIN must be a valid origin URL");
  }
  if (
    url.origin === "null" ||
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("ADMIN_CORS_ORIGIN must contain only an http(s) origin without credentials, path, query, or hash");
  }
  return url.origin;
}

function isUnsafeSecret(value: string | undefined) {
  return !value || value === "change_me" || value.length < 24;
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const appScheme = env.APP_SCHEME || env.EXPO_PUBLIC_APP_SCHEME || "trainer";
  const publicAppRedirectUri = env.PUBLIC_APP_REDIRECT_URI || `${appScheme}://auth/callback`;

  const config = {
    nodeEnv,
    isProduction,
    port: readInteger(env.PORT, 3000),
    apiBaseUrl: env.API_BASE_URL || `http://localhost:${readInteger(env.PORT, 3000)}`,
    appScheme,
    publicAppRedirectUri,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: readList(env.CORS_ORIGINS, ["http://localhost:8081", "http://localhost:19006"]),
    trustedProxyCidrs: readTrustedProxyCidrs(env.TRUSTED_PROXY_CIDRS),
    admin: {
      enabled: readBoolean(env.ADMIN_ENABLED, true),
      cookieName: env.ADMIN_COOKIE_NAME || "admin_session",
      csrfCookieName: env.ADMIN_CSRF_COOKIE_NAME || "admin_csrf",
      sessionTtlDays: readInteger(env.ADMIN_SESSION_TTL_DAYS, 7),
      corsOrigin: readAdminOrigin(env.ADMIN_CORS_ORIGIN),
      sessionPepper: env.ADMIN_SESSION_PEPPER || env.REFRESH_TOKEN_PEPPER || "change_me",
      loginRateLimitMax: readInteger(env.ADMIN_LOGIN_RATE_LIMIT_MAX, 10),
      loginRateLimitWindowSeconds: readInteger(env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS, 900),
      initialEmail: env.ADMIN_INITIAL_EMAIL,
      initialPassword: env.ADMIN_INITIAL_PASSWORD
    },
    authEnabled: readBoolean(env.AUTH_ENABLED, true),
    providerFlags: {
      email: readBoolean(env.EMAIL_AUTH_ENABLED, true),
      yandex: readBoolean(env.YANDEX_AUTH_ENABLED, !isProduction),
      vk: readBoolean(env.VK_AUTH_ENABLED, !isProduction)
    },
    tokens: {
      accessSecret: env.JWT_ACCESS_SECRET || "change_me",
      accessTtlMinutes: readInteger(env.ACCESS_TOKEN_TTL_MINUTES, 15),
      refreshTtlDays: readInteger(env.REFRESH_TOKEN_TTL_DAYS, 30),
      refreshPepper: env.REFRESH_TOKEN_PEPPER || env.JWT_REFRESH_SECRET || "change_me"
    },
    accountDeletion: {
      receiptTtlHours: readAccountDeletionReceiptTtlHours(env.ACCOUNT_DELETION_RECEIPT_TTL_HOURS)
    },
    emailCodes: {
      ttlSeconds: readInteger(env.EMAIL_CODE_TTL_SECONDS, 300),
      resendSeconds: readInteger(env.EMAIL_CODE_RESEND_SECONDS, 60),
      length: readEmailCodeLength(env.EMAIL_CODE_LENGTH),
      maxAttempts: readInteger(env.EMAIL_CODE_MAX_ATTEMPTS, 5),
      pepper: env.EMAIL_CODE_PEPPER || "change_me"
    },
    loginTicket: {
      ttlSeconds: readInteger(env.LOGIN_TICKET_TTL_SECONDS, 120),
      pepper: env.LOGIN_TICKET_PEPPER || env.REFRESH_TOKEN_PEPPER || "change_me"
    },
    oauthState: {
      ttlSeconds: readInteger(env.OAUTH_STATE_TTL_SECONDS, 600),
      pepper: env.OAUTH_STATE_PEPPER || env.REFRESH_TOKEN_PEPPER || "change_me",
      encryptionSecret: env.OAUTH_STATE_ENCRYPTION_SECRET || env.JWT_ACCESS_SECRET || "change_me"
    },
    rateLimits: {
      emailStartPerEmail: readInteger(env.RATE_LIMIT_EMAIL_START_PER_EMAIL, 5),
      emailStartPerIp: readInteger(env.RATE_LIMIT_EMAIL_START_PER_IP, 20),
      emailVerifyPerEmail: readInteger(env.RATE_LIMIT_EMAIL_VERIFY_PER_EMAIL, 20),
      oauthStartPerIp: readInteger(env.RATE_LIMIT_OAUTH_START_PER_IP, 20),
      windowSeconds: readInteger(env.RATE_LIMIT_WINDOW_SECONDS, 900)
    },
    emailSender: {
      kind: readEmailSenderKind(env.EMAIL_SENDER),
      smtpHost: env.SMTP_HOST,
      smtpPort: readInteger(env.SMTP_PORT, 587),
      smtpSecure: readBoolean(env.SMTP_SECURE, readInteger(env.SMTP_PORT, 587) === 465),
      smtpUser: env.SMTP_USER,
      smtpPassword: env.SMTP_PASSWORD,
      smtpFrom: env.EMAIL_FROM || env.SMTP_FROM,
      smtpFromName: env.EMAIL_FROM_NAME || "Trener",
      resendApiKey: env.RESEND_API_KEY
    },
    oauth: {
      yandex: {
        clientId: env.YANDEX_CLIENT_ID,
        clientSecret: env.YANDEX_CLIENT_SECRET,
        redirectUri: env.YANDEX_REDIRECT_URI || "http://localhost:3000/auth/oauth/yandex/callback",
        scopes: readList(env.YANDEX_SCOPES, ["login:email", "login:info", "login:avatar"]),
        authorizationUrl: env.YANDEX_AUTHORIZATION_URL || "https://oauth.yandex.ru/authorize",
        tokenUrl: env.YANDEX_TOKEN_URL || "https://oauth.yandex.ru/token",
        profileUrl: env.YANDEX_PROFILE_URL || "https://login.yandex.ru/info"
      },
      vk: {
        clientId: env.VK_CLIENT_ID,
        clientSecret: env.VK_CLIENT_SECRET,
        redirectUri: env.VK_REDIRECT_URI || "http://localhost:3000/auth/oauth/vk/callback",
        scopes: readList(env.VK_SCOPES, ["vkid.personal_info", "email"]),
        authorizationUrl: env.VK_AUTHORIZATION_URL || "https://id.vk.com/authorize",
        tokenUrl: env.VK_TOKEN_URL || "https://id.vk.com/oauth2/auth",
        profileUrl: env.VK_PROFILE_URL || "https://id.vk.com/oauth2/user_info"
      }
    }
  };

  validateConfig(config);
  return config;
}

export function providerConfigured(config: AuthServerConfig, provider: OAuthProvider) {
  const providerConfig = config.oauth[provider];
  return Boolean(config.authEnabled && config.providerFlags[provider] && providerConfig.clientId && providerConfig.clientSecret && providerConfig.redirectUri);
}

function validateConfig(config: ReturnType<typeof loadAuthConfig>) {
  validateEmailSenderConfig(config);
  if (!config.isProduction) return;
  const missing: string[] = [];
  if (isUnsafeSecret(config.tokens.accessSecret)) missing.push("JWT_ACCESS_SECRET");
  if (isUnsafeSecret(config.tokens.refreshPepper)) missing.push("REFRESH_TOKEN_PEPPER");
  if (isUnsafeSecret(config.emailCodes.pepper)) missing.push("EMAIL_CODE_PEPPER");
  if (isUnsafeSecret(config.loginTicket.pepper)) missing.push("LOGIN_TICKET_PEPPER");
  if (isUnsafeSecret(config.oauthState.encryptionSecret)) missing.push("OAUTH_STATE_ENCRYPTION_SECRET");
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (config.trustedProxyCidrs.length === 0) missing.push("TRUSTED_PROXY_CIDRS");
  if (config.admin.enabled && isUnsafeSecret(config.admin.sessionPepper)) missing.push("ADMIN_SESSION_PEPPER");
  if (config.admin.enabled && !config.admin.corsOrigin.startsWith("https://")) missing.push("ADMIN_CORS_ORIGIN must use https");
  for (const provider of ["yandex", "vk"] as const) {
    if (!config.providerFlags[provider]) continue;
    const providerConfig = config.oauth[provider];
    if (!providerConfig.clientId) missing.push(`${provider.toUpperCase()}_CLIENT_ID`);
    if (!providerConfig.clientSecret) missing.push(`${provider.toUpperCase()}_CLIENT_SECRET`);
  }
  if (missing.length > 0) {
    throw new Error(`Production auth config is incomplete: ${missing.join(", ")}`);
  }
}

function validateEmailSenderConfig(config: ReturnType<typeof loadAuthConfig>) {
  const missing: string[] = [];
  if (config.emailSender.kind === "console") {
    if (config.isProduction) missing.push("EMAIL_SENDER must not be console");
  } else if (config.emailSender.kind === "smtp") {
    if (!config.emailSender.smtpHost) missing.push("SMTP_HOST");
    if (!config.emailSender.smtpUser) missing.push("SMTP_USER");
    if (!config.emailSender.smtpPassword) missing.push("SMTP_PASSWORD");
    if (!config.emailSender.smtpFrom) missing.push("EMAIL_FROM");
    if (config.emailSender.smtpPort < 1 || config.emailSender.smtpPort > 65_535) missing.push("SMTP_PORT");
  } else {
    if (!config.emailSender.resendApiKey) missing.push("RESEND_API_KEY");
    if (!config.emailSender.smtpFrom) missing.push("EMAIL_FROM");
  }
  if (missing.length > 0) {
    throw new Error(`Email sender config is incomplete: ${missing.join(", ")}`);
  }
}
