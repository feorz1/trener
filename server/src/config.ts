import type { OAuthProvider } from "./types";

export type AuthServerConfig = ReturnType<typeof loadAuthConfig>;

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
    admin: {
      enabled: readBoolean(env.ADMIN_ENABLED, true),
      cookieName: env.ADMIN_COOKIE_NAME || "admin_session",
      csrfCookieName: env.ADMIN_CSRF_COOKIE_NAME || "admin_csrf",
      sessionTtlDays: readInteger(env.ADMIN_SESSION_TTL_DAYS, 7),
      corsOrigin: env.ADMIN_CORS_ORIGIN || "http://localhost:5173",
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
    emailCodes: {
      ttlSeconds: readInteger(env.EMAIL_CODE_TTL_SECONDS, 300),
      resendSeconds: readInteger(env.EMAIL_CODE_RESEND_SECONDS, 60),
      length: readInteger(env.EMAIL_CODE_LENGTH, 6),
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
      kind: env.EMAIL_SENDER || "console",
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
  if (!config.isProduction) return;
  const missing: string[] = [];
  if (isUnsafeSecret(config.tokens.accessSecret)) missing.push("JWT_ACCESS_SECRET");
  if (isUnsafeSecret(config.tokens.refreshPepper)) missing.push("REFRESH_TOKEN_PEPPER");
  if (isUnsafeSecret(config.emailCodes.pepper)) missing.push("EMAIL_CODE_PEPPER");
  if (isUnsafeSecret(config.loginTicket.pepper)) missing.push("LOGIN_TICKET_PEPPER");
  if (isUnsafeSecret(config.oauthState.encryptionSecret)) missing.push("OAUTH_STATE_ENCRYPTION_SECRET");
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (config.admin.enabled && isUnsafeSecret(config.admin.sessionPepper)) missing.push("ADMIN_SESSION_PEPPER");
  if (config.admin.enabled && !config.admin.corsOrigin) missing.push("ADMIN_CORS_ORIGIN");
  if (config.emailSender.kind === "console") missing.push("EMAIL_SENDER must not be console");
  if (config.emailSender.kind === "resend" && !config.emailSender.resendApiKey) missing.push("RESEND_API_KEY");
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
