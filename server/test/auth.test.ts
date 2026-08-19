import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { loadAuthConfig } from "../src/config";
import { createEmailSender, ResendEmailSender } from "../src/email";
import { buildApi, normalizeClientIp } from "../src/app";
import { InMemoryAccountDeletionRepository } from "../src/accountDeletion/InMemoryAccountDeletionRepository";
import { PrismaAccountDeletionRepository } from "../src/accountDeletion/PrismaAccountDeletionRepository";
import { InMemoryAdminRepository } from "../src/admin/InMemoryAdminRepository";
import { InMemoryTrainerDataRepository } from "../src/data/InMemoryTrainerDataRepository";
import { InMemoryAuthRepository } from "../src/repositories/InMemoryAuthRepository";
import type { EmailSender, NormalizedOAuthProfile, OAuthProvider, OAuthProviderAdapter } from "../src/types";

class CapturingEmailSender implements EmailSender {
  sent: Array<{ email: string; code: string; ttlSeconds: number }> = [];

  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    this.sent.push(params);
  }
}

class FakeOAuthAdapter implements OAuthProviderAdapter {
  constructor(readonly provider: OAuthProvider) {}

  async getAuthorizationUrl(params: { state: string; redirectUri: string; codeChallenge?: string }) {
    const url = new URL(`https://${this.provider}.example/authorize`);
    url.searchParams.set("state", params.state);
    url.searchParams.set("redirect_uri", params.redirectUri);
    if (params.codeChallenge) url.searchParams.set("code_challenge", params.codeChallenge);
    return url.toString();
  }

  async exchangeCode() {
    return { access_token: `${this.provider}-token` };
  }

  async getProfile(): Promise<NormalizedOAuthProfile> {
    return {
      provider: this.provider,
      subject: `${this.provider}-subject`,
      email: `${this.provider}@example.com`,
      emailVerified: true,
      displayName: `${this.provider} trainer`,
      avatarUrl: null,
      rawProfile: { ok: true }
    };
  }
}

function createTestApi(
  env: NodeJS.ProcessEnv = {},
  deletionOptions: { beforeCommit?: () => void | Promise<void> } = {}
) {
  const config = loadAuthConfig({
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
    REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
    EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
    LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
    OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
    YANDEX_CLIENT_ID: "yandex-client",
    YANDEX_CLIENT_SECRET: "yandex-secret",
    VK_CLIENT_ID: "vk-client",
    VK_CLIENT_SECRET: "vk-secret",
    EMAIL_CODE_RESEND_SECONDS: "60",
    ...env
  });
  const repository = new InMemoryAuthRepository();
  const dataRepository = new InMemoryTrainerDataRepository();
  const adminRepository = new InMemoryAdminRepository();
  const accountDeletionRepository = new InMemoryAccountDeletionRepository(
    repository,
    dataRepository,
    adminRepository,
    deletionOptions
  );
  const emailSender = new CapturingEmailSender();
  const app = buildApi({
    config,
    repository,
    dataRepository,
    adminRepository,
    accountDeletionRepository,
    emailSender,
    oauthAdapters: {
      yandex: new FakeOAuthAdapter("yandex"),
      vk: new FakeOAuthAdapter("vk")
    }
  });
  return { app, config, repository, dataRepository, adminRepository, accountDeletionRepository, emailSender };
}

describe("public release information", () => {
  it.each([
    ["/privacy", ["Trener", "Оператор приложения Trener", "support@trener-app.com", "тренировочные данные", "Удалить аккаунт"]],
    ["/support", ["Поддержка Trener", "support@trener-app.com", "Не отправляйте пароль", "/privacy"]]
  ])("serves %s without authentication and exposes a matching HEAD route", async (path, expectedContent) => {
    const { app } = createTestApi();

    const response = await app.inject({ method: "GET", url: path });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    for (const content of expectedContent) {
      expect(response.body).toContain(content);
    }
    expect(response.body).not.toContain("OWNER ACTION");
    expect(response.body).not.toContain("localhost");

    const head = await app.inject({ method: "HEAD", url: path });
    expect(head.statusCode).toBe(200);
    expect(head.headers["content-type"]).toContain("text/html");
    expect(head.body).toBe("");
  });
});

describe("production auth backend", () => {
  it("keeps console email blocked in production and reads production SMTP settings", () => {
    const productionEnv = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@postgres:5432/app",
      JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
      REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
      EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
      LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
      OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
      ADMIN_SESSION_PEPPER: "test_admin_session_pepper_12345678901",
      ADMIN_CORS_ORIGIN: "https://admin.example.com",
      TRUSTED_PROXY_CIDRS: "172.20.0.10/32",
      YANDEX_AUTH_ENABLED: "false",
      VK_AUTH_ENABLED: "false"
    };
    expect(() => loadAuthConfig({ ...productionEnv, EMAIL_SENDER: "console" })).toThrow(/EMAIL_SENDER must not be console/);

    const config = loadAuthConfig({
      ...productionEnv,
      EMAIL_SENDER: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "true",
      SMTP_USER: "smtp-user",
      SMTP_PASSWORD: "smtp-password",
      EMAIL_FROM: "no-reply@example.com",
      EMAIL_FROM_NAME: "Trener"
    });

    expect(config.emailSender.smtpSecure).toBe(true);
    expect(config.emailSender.smtpFrom).toBe("no-reply@example.com");
    expect(config.emailSender.smtpFromName).toBe("Trener");
  });

  it("requires a Resend API key for production resend email and creates a Resend sender", () => {
    const productionEnv = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@postgres:5432/app",
      JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
      REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
      EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
      LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
      OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
      ADMIN_SESSION_PEPPER: "test_admin_session_pepper_12345678901",
      ADMIN_CORS_ORIGIN: "https://admin.example.com",
      TRUSTED_PROXY_CIDRS: "172.20.0.10/32",
      YANDEX_AUTH_ENABLED: "false",
      VK_AUTH_ENABLED: "false",
      EMAIL_SENDER: "resend",
      EMAIL_FROM: "auth@trener-app.com",
      EMAIL_FROM_NAME: "Trener"
    };

    expect(() => loadAuthConfig(productionEnv)).toThrow(/RESEND_API_KEY/);

    const config = loadAuthConfig({
      ...productionEnv,
      RESEND_API_KEY: "test_resend_key_12345678901234567890"
    });

    expect(config.emailSender.kind).toBe("resend");
    expect(config.emailSender.resendApiKey).toBeTruthy();
    expect(createEmailSender(config)).toBeInstanceOf(ResendEmailSender);
  });

  it("rejects unknown or incomplete production email senders and non-six-digit OTP configuration", () => {
    const productionEnv = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@postgres:5432/app",
      JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
      REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
      EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
      LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
      OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
      ADMIN_SESSION_PEPPER: "test_admin_session_pepper_12345678901",
      ADMIN_CORS_ORIGIN: "https://admin.example.com",
      TRUSTED_PROXY_CIDRS: "172.20.0.10/32",
      YANDEX_AUTH_ENABLED: "false",
      VK_AUTH_ENABLED: "false"
    };

    expect(() => loadAuthConfig({ ...productionEnv, EMAIL_SENDER: "smtpp" })).toThrow(/EMAIL_SENDER must be one of/);
    expect(() => loadAuthConfig({ ...productionEnv, EMAIL_SENDER: "smtp", EMAIL_FROM: "auth@example.com" })).toThrow(
      /SMTP_HOST, SMTP_USER, SMTP_PASSWORD/
    );
    expect(() => loadAuthConfig({ ...productionEnv, EMAIL_SENDER: "resend", RESEND_API_KEY: "test-key" })).toThrow(/EMAIL_FROM/);
    expect(() => loadAuthConfig({ EMAIL_CODE_LENGTH: "4" })).toThrow(/must be exactly 6/);
    expect(() => loadAuthConfig({ EMAIL_CODE_LENGTH: "8" })).toThrow(/must be exactly 6/);
  });

  it("bounds the account-deletion receipt retention TTL", () => {
    expect(loadAuthConfig({}).accountDeletion.receiptTtlHours).toBe(24);
    expect(loadAuthConfig({ ACCOUNT_DELETION_RECEIPT_TTL_HOURS: "48" }).accountDeletion.receiptTtlHours).toBe(48);
    expect(() => loadAuthConfig({ ACCOUNT_DELETION_RECEIPT_TTL_HOURS: "0" })).toThrow(/integer from 1 to 168/);
    expect(() => loadAuthConfig({ ACCOUNT_DELETION_RECEIPT_TTL_HOURS: "169" })).toThrow(/integer from 1 to 168/);
  });

  it("requires explicit bounded trusted proxy networks in production", () => {
    const productionEnv = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@postgres:5432/app",
      JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
      REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
      EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
      LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
      OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
      ADMIN_ENABLED: "false",
      YANDEX_AUTH_ENABLED: "false",
      VK_AUTH_ENABLED: "false",
      EMAIL_SENDER: "resend",
      RESEND_API_KEY: "test-key",
      EMAIL_FROM: "auth@example.com"
    };

    expect(() => loadAuthConfig(productionEnv)).toThrow(/TRUSTED_PROXY_CIDRS/);
    expect(() => loadAuthConfig({ ...productionEnv, TRUSTED_PROXY_CIDRS: "0.0.0.0/0" })).toThrow(/\/0 is forbidden/);
    expect(() => loadAuthConfig({ ...productionEnv, TRUSTED_PROXY_CIDRS: "not-a-network" })).toThrow(/explicit IP addresses/);
    expect(loadAuthConfig({ ...productionEnv, TRUSTED_PROXY_CIDRS: "172.20.0.10/32 2001:db8::10/128" }).trustedProxyCidrs).toEqual([
      "172.20.0.10/32",
      "2001:db8::10/128"
    ]);
  });

  it("normalizes IPv6 and IPv4-mapped client addresses", () => {
    expect(normalizeClientIp("2001:0db8:0:0:0:0:0:1")).toBe("2001:db8::1");
    expect(normalizeClientIp("2001:db8::1")).toBe("2001:db8::1");
    expect(normalizeClientIp("::ffff:192.0.2.1")).toBe("192.0.2.1");
    expect(normalizeClientIp("not-an-ip")).toBeNull();
  });

  it("uses trusted forwarded client IPs while direct spoofing and malformed chains fail closed", async () => {
    const trusted = createTestApi({
      TRUSTED_PROXY_CIDRS: "10.0.0.2/32",
      RATE_LIMIT_EMAIL_START_PER_EMAIL: "10",
      RATE_LIMIT_EMAIL_START_PER_IP: "1",
      EMAIL_CODE_RESEND_SECONDS: "0"
    });
    const injectStart = (email: string, forwardedFor: string, remoteAddress: string) =>
      trusted.app.inject({
        method: "POST",
        url: "/auth/email/start",
        remoteAddress,
        headers: { "x-forwarded-for": forwardedFor },
        payload: { email }
      });

    expect((await injectStart("proxy-a@example.com", "198.51.100.1", "10.0.0.2")).statusCode).toBe(200);
    expect((await injectStart("proxy-b@example.com", "203.0.113.2", "10.0.0.2")).statusCode).toBe(200);
    expect((await injectStart("proxy-c@example.com", "198.51.100.1", "10.0.0.2")).statusCode).toBe(429);

    const direct = createTestApi({
      TRUSTED_PROXY_CIDRS: "10.0.0.2/32",
      RATE_LIMIT_EMAIL_START_PER_EMAIL: "10",
      RATE_LIMIT_EMAIL_START_PER_IP: "1",
      EMAIL_CODE_RESEND_SECONDS: "0"
    });
    const directStart = (email: string, forwardedFor: string) =>
      direct.app.inject({
        method: "POST",
        url: "/auth/email/start",
        remoteAddress: "198.51.100.20",
        headers: { "x-forwarded-for": forwardedFor },
        payload: { email }
      });
    expect((await directStart("direct-a@example.com", "192.0.2.1")).statusCode).toBe(200);
    expect((await directStart("direct-b@example.com", "192.0.2.2")).statusCode).toBe(429);

    const malformed = createTestApi({
      TRUSTED_PROXY_CIDRS: "10.0.0.2/32",
      RATE_LIMIT_EMAIL_START_PER_EMAIL: "10",
      RATE_LIMIT_EMAIL_START_PER_IP: "1",
      EMAIL_CODE_RESEND_SECONDS: "0"
    });
    const malformedStart = (email: string, forwardedFor: string) =>
      malformed.app.inject({
        method: "POST",
        url: "/auth/email/start",
        remoteAddress: "10.0.0.2",
        headers: { "x-forwarded-for": forwardedFor },
        payload: { email }
      });
    expect((await malformedStart("malformed-a@example.com", "not-an-ip")).statusCode).toBe(200);
    expect((await malformedStart("malformed-b@example.com", "still-not-an-ip")).statusCode).toBe(429);
  });

  it("serves health and provider availability", async () => {
    const { app } = createTestApi();
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ ok: true, service: "api" });

    const providers = await app.inject({ method: "GET", url: "/auth/providers" });
    expect(providers.json()).toEqual({ email: true, yandex: true, vk: true });
  });

  it("defaults social providers off in production and rejects disabled OAuth entry points", async () => {
    const { app, config, repository } = createTestApi({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@postgres:5432/app",
      ADMIN_ENABLED: "false",
      TRUSTED_PROXY_CIDRS: "172.20.0.10/32",
      EMAIL_SENDER: "smtp",
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "smtp-user",
      SMTP_PASSWORD: "smtp-password",
      EMAIL_FROM: "auth@example.com"
    });

    expect(config.providerFlags).toEqual({ email: true, yandex: false, vk: false });

    const providers = await app.inject({ method: "GET", url: "/auth/providers" });
    expect(providers.statusCode).toBe(200);
    expect(providers.json()).toEqual({ email: true, yandex: false, vk: false });

    for (const provider of ["yandex", "vk"] as const) {
      const start = await app.inject({
        method: "GET",
        url: `/auth/oauth/${provider}/start?return_to=app`,
        headers: { accept: "application/json" }
      });
      expect(start.statusCode).toBe(403);
      expect(start.json().code).toBe("provider_disabled");

      const callback = await app.inject({ method: "GET", url: `/auth/oauth/${provider}/callback?code=ok&state=blocked` });
      expect(callback.statusCode).toBe(403);
      expect(callback.json().code).toBe("provider_disabled");

      const cancelledCallback = await app.inject({ method: "GET", url: `/auth/oauth/${provider}/callback?error=access_denied` });
      expect(cancelledCallback.statusCode).toBe(403);
      expect(cancelledCallback.json().code).toBe("provider_disabled");
    }

    expect(repository.oauthStates.size).toBe(0);
  });

  it("starts email login, rejects invalid email, and enforces resend delay", async () => {
    const { app, emailSender } = createTestApi();
    const invalid = await app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "bad" } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().code).toBe("invalid_email");

    const started = await app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "Trainer@Example.COM" } });
    expect(started.statusCode).toBe(200);
    expect(started.json()).toMatchObject({ ok: true, ttlSeconds: 300, resendAfterSeconds: 60 });
    expect(emailSender.sent[0].email).toBe("Trainer@example.com");

    const resent = await app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "Trainer@example.com" } });
    expect(resent.statusCode).toBe(429);
    expect(resent.json().code).toBe("resend_too_soon");
  });

  it("verifies email code once and returns a session", async () => {
    const { app, emailSender } = createTestApi();
    await app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "trainer@example.com" } });
    const code = emailSender.sent[0].code;
    const wrong = await app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "trainer@example.com", code: "000000" } });
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json().code).toBe("invalid_code");

    const verified = await app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "trainer@example.com", code } });
    expect(verified.statusCode).toBe(200);
    expect(verified.json().user).toMatchObject({ email: "trainer@example.com", emailVerified: true, providers: ["email"] });

    const reused = await app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "trainer@example.com", code } });
    expect(reused.statusCode).toBe(400);
    expect(reused.json().code).toBe("invalid_code");
  });

  it("consumes one email code atomically under concurrent verification", async () => {
    const api = createTestApi({ RATE_LIMIT_EMAIL_VERIFY_PER_EMAIL: "10" });
    await api.app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "concurrent@example.com" } });
    const code = api.emailSender.sent[0].code;

    const [first, second] = await Promise.all([
      api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "concurrent@example.com", code } }),
      api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "concurrent@example.com", code } })
    ]);

    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 400]);
    expect([...api.repository.users.values()].filter((user) => user.email?.toLowerCase() === "concurrent@example.com")).toHaveLength(1);
  });

  it("rejects expired codes and too many attempts", async () => {
    const expiredApi = createTestApi({ EMAIL_CODE_TTL_SECONDS: "-1" });
    await expiredApi.app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "expired@example.com" } });
    const expired = await expiredApi.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "expired@example.com", code: expiredApi.emailSender.sent[0].code } });
    expect(expired.statusCode).toBe(400);
    expect(expired.json().code).toBe("code_expired");

    const limitedApi = createTestApi({ EMAIL_CODE_MAX_ATTEMPTS: "2" });
    await limitedApi.app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "limited@example.com" } });
    await limitedApi.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "limited@example.com", code: "000000" } });
    const tooMany = await limitedApi.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "limited@example.com", code: "000000" } });
    expect(tooMany.statusCode).toBe(429);
    expect(tooMany.json().code).toBe("too_many_attempts");
  });

  it("claims email verification attempts atomically", async () => {
    const api = createTestApi({ EMAIL_CODE_MAX_ATTEMPTS: "2", RATE_LIMIT_EMAIL_VERIFY_PER_EMAIL: "10" });
    const email = "attempt-race@example.com";
    await api.app.inject({ method: "POST", url: "/auth/email/start", payload: { email } });
    const correctCode = api.emailSender.sent.at(-1)?.code;

    const wrongResponses = await Promise.all(
      Array.from({ length: 3 }, () =>
        api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email, code: "000000" } })
      )
    );

    expect(wrongResponses.filter((response) => response.statusCode === 429)).toHaveLength(2);
    expect((await api.repository.findLatestEmailCode(email))?.attemptCount).toBe(2);
    const afterLimit = await api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email, code: correctCode } });
    expect(afterLimit.statusCode).toBe(429);
    expect([...api.repository.users.values()].filter((user) => user.email === email)).toHaveLength(0);
  });

  it("rotates refresh tokens, detects reuse, serves /me, and logs out idempotently", async () => {
    const api = createTestApi();
    const { app } = api;
    const session = await signInByEmail(api);
    const me = await app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${session.accessToken}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe("trainer@example.com");

    const missingMe = await app.inject({ method: "GET", url: "/me" });
    expect(missingMe.statusCode).toBe(401);

    const refreshed = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().refreshToken).not.toBe(session.refreshToken);

    const reusedOld = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } });
    expect(reusedOld.statusCode).toBe(401);
    expect(reusedOld.json().code).toBe("invalid_refresh_token");

    const revokedByReuse = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: refreshed.json().refreshToken } });
    expect(revokedByReuse.statusCode).toBe(401);

    const secondSession = await signInByEmail(api, "logout@example.com");
    const logout = await app.inject({ method: "POST", url: "/auth/logout", payload: { refreshToken: secondSession.refreshToken } });
    expect(logout.statusCode).toBe(200);
    const logoutAgain = await app.inject({ method: "POST", url: "/auth/logout", payload: { refreshToken: secondSession.refreshToken } });
    expect(logoutAgain.statusCode).toBe(200);
    const afterLogout = await app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: secondSession.refreshToken } });
    expect(afterLogout.statusCode).toBe(401);
  });

  it("allows exactly one concurrent refresh rotation and creates one successor", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "refresh-race@example.com");
    const original = [...api.repository.refreshTokens.values()].find((record) => record.userId === session.user.id);
    expect(original).toBeTruthy();

    const responses = await Promise.all([
      api.app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } }),
      api.app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } })
    ]);

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 401]);
    const success = responses.find((response) => response.statusCode === 200);
    const rejected = responses.find((response) => response.statusCode === 401);
    expect(rejected?.json().code).toBe("invalid_refresh_token");
    expect([...api.repository.refreshTokens.values()].filter((record) => record.rotatedFromTokenId === original?.id)).toHaveLength(1);

    const replayProtectedSuccessor = await api.app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: success?.json().refreshToken }
    });
    expect(replayProtectedSuccessor.statusCode).toBe(401);
  });

  it("keeps refresh-token reuse revocation in the original device family", async () => {
    const api = createTestApi();
    const email = "refresh-family@example.com";
    await api.app.inject({ method: "POST", url: "/auth/email/start", payload: { email } });
    const code = api.emailSender.sent.at(-1)?.code;
    const signedIn = await api.app.inject({
      method: "POST",
      url: "/auth/email/verify",
      headers: { "x-device-id": "trusted-device" },
      payload: { email, code }
    });
    expect(signedIn.statusCode).toBe(200);
    const original = [...api.repository.refreshTokens.values()].find((record) => record.deviceId === "trusted-device");
    expect(original).toBeTruthy();

    const rotated = await api.app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: { "x-device-id": "attacker-controlled-device" },
      payload: { refreshToken: signedIn.json().refreshToken }
    });
    expect(rotated.statusCode).toBe(200);
    const successor = [...api.repository.refreshTokens.values()].find((record) => record.rotatedFromTokenId === original?.id);
    expect(successor?.deviceId).toBe("trusted-device");

    const replay = await api.app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: signedIn.json().refreshToken }
    });
    expect(replay.statusCode).toBe(401);
    const revokedSuccessor = await api.app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: rotated.json().refreshToken }
    });
    expect(revokedSuccessor.statusCode).toBe(401);
  });

  it("rejects blocked trainers on /me, refresh, and new login", async () => {
    const api = createTestApi({ EMAIL_CODE_RESEND_SECONDS: "0" });
    const session = await signInByEmail(api, "blocked@example.com");
    await api.repository.updateUser(session.user.id, { blockedAt: new Date(), blockedReason: "policy" });

    const me = await api.app.inject({ method: "GET", url: "/me", headers: { authorization: `Bearer ${session.accessToken}` } });
    expect(me.statusCode).toBe(401);
    expect(me.json().code).toBe("session_expired");

    const refreshed = await api.app.inject({ method: "POST", url: "/auth/refresh", payload: { refreshToken: session.refreshToken } });
    expect(refreshed.statusCode).toBe(401);
    expect(refreshed.json().code).toBe("session_expired");

    await api.app.inject({ method: "POST", url: "/auth/email/start", payload: { email: "blocked@example.com" } });
    const code = api.emailSender.sent.at(-1)?.code;
    const verifiedAgain = await api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email: "blocked@example.com", code } });
    expect(verifiedAgain.statusCode).toBe(401);
    expect(verifiedAgain.json().code).toBe("session_expired");
  });

  it("creates OAuth state, handles callback, exchanges a one-time ticket, and reuses identity", async () => {
    const { app, repository } = createTestApi({ YANDEX_AUTH_ENABLED: "true", VK_AUTH_ENABLED: "true" });
    const started = await app.inject({ method: "GET", url: "/auth/oauth/yandex/start?return_to=app", headers: { accept: "application/json" } });
    expect(started.statusCode).toBe(200);
    const authorizationUrl = new URL(started.json().authorizationUrl);
    expect(authorizationUrl.searchParams.get("code_challenge")).toBeTruthy();

    const invalid = await app.inject({ method: "GET", url: "/auth/oauth/yandex/callback?code=ok&state=bad" });
    expect(invalid.headers.location).toContain("error=oauth_failed");

    const callback = await app.inject({ method: "GET", url: `/auth/oauth/yandex/callback?code=ok&state=${authorizationUrl.searchParams.get("state")}` });
    expect(callback.statusCode).toBe(302);
    const redirect = new URL(callback.headers.location!);
    const ticket = redirect.searchParams.get("ticket");
    expect(ticket).toBeTruthy();

    const exchanged = await app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } });
    expect(exchanged.statusCode).toBe(200);
    expect(exchanged.json().user.providers).toEqual(["yandex"]);

    const reusedTicket = await app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } });
    expect(reusedTicket.statusCode).toBe(400);
    expect(reusedTicket.json().code).toBe("ticket_already_used");

    const firstUserCount = repository.users.size;
    const secondStart = await app.inject({ method: "GET", url: "/auth/oauth/yandex/start?return_to=app", headers: { accept: "application/json" } });
    const secondState = new URL(secondStart.json().authorizationUrl).searchParams.get("state");
    await app.inject({ method: "GET", url: `/auth/oauth/yandex/callback?code=ok&state=${secondState}` });
    expect(repository.users.size).toBe(firstUserCount);
  });

  it("allows exactly one concurrent login-ticket exchange", async () => {
    const api = createTestApi({ YANDEX_AUTH_ENABLED: "true", VK_AUTH_ENABLED: "true" });
    const started = await api.app.inject({
      method: "GET",
      url: "/auth/oauth/yandex/start?return_to=app",
      headers: { accept: "application/json" }
    });
    const state = new URL(started.json().authorizationUrl).searchParams.get("state");
    const callback = await api.app.inject({ method: "GET", url: `/auth/oauth/yandex/callback?code=ok&state=${state}` });
    const ticket = new URL(callback.headers.location!).searchParams.get("ticket");

    const responses = await Promise.all([
      api.app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } }),
      api.app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } })
    ]);

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 400]);
    expect(responses.find((response) => response.statusCode === 400)?.json().code).toBe("ticket_already_used");
    const userId = responses.find((response) => response.statusCode === 200)?.json().user.id;
    expect([...api.repository.refreshTokens.values()].filter((record) => record.userId === userId)).toHaveLength(1);
  });

  it("rejects expired login tickets", async () => {
    const { app } = createTestApi({ LOGIN_TICKET_TTL_SECONDS: "-1", YANDEX_AUTH_ENABLED: "true", VK_AUTH_ENABLED: "true" });
    const started = await app.inject({ method: "GET", url: "/auth/oauth/vk/start?return_to=app", headers: { accept: "application/json" } });
    const state = new URL(started.json().authorizationUrl).searchParams.get("state");
    const callback = await app.inject({ method: "GET", url: `/auth/oauth/vk/callback?code=ok&state=${state}` });
    const ticket = new URL(callback.headers.location!).searchParams.get("ticket");
    const exchanged = await app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } });
    expect(exchanged.statusCode).toBe(400);
    expect(exchanged.json().code).toBe("ticket_expired");
  });

  it("rejects a previously issued social ticket after its provider is disabled", async () => {
    const api = createTestApi({ YANDEX_AUTH_ENABLED: "true", VK_AUTH_ENABLED: "true" });
    const started = await api.app.inject({
      method: "GET",
      url: "/auth/oauth/yandex/start?return_to=app",
      headers: { accept: "application/json" }
    });
    const state = new URL(started.json().authorizationUrl).searchParams.get("state");
    const callback = await api.app.inject({ method: "GET", url: `/auth/oauth/yandex/callback?code=ok&state=${state}` });
    const ticket = new URL(callback.headers.location!).searchParams.get("ticket");

    api.config.providerFlags.yandex = false;

    const exchanged = await api.app.inject({ method: "POST", url: "/auth/ticket/exchange", payload: { ticket } });
    expect(exchanged.statusCode).toBe(403);
    expect(exchanged.json().code).toBe("provider_disabled");
  });

  it("requires authentication to delete the current account", async () => {
    const { app } = createTestApi();
    const credentials = deletionCredentials();

    const response = await app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: deletionPayload(credentials)
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe("session_expired");
  });

  it("reconciles a completed deletion after the original 204 response is lost", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "lost-delete-response@example.com");
    const credentials = deletionCredentials();

    const committed = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(credentials)
    });
    expect(committed.statusCode).toBe(204);

    const reconciled = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: { authorization: "Bearer expired-after-commit" },
      payload: deletionPayload(credentials)
    });
    expect(reconciled.statusCode).toBe(204);
    const receipt = api.accountDeletionRepository.receipts.get(credentials.operationId);
    expect(receipt).toMatchObject({ operationId: credentials.operationId });
    expect(receipt).not.toHaveProperty("userId");
    expect(JSON.stringify(receipt)).not.toContain(credentials.recoverySecret);

    receipt!.expiresAt = new Date(0);
    const reconciledAfterExpiry = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: deletionPayload(credentials)
    });
    const wrongProofAfterExpiry = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: deletionPayload({ ...credentials, recoverySecret: "B".repeat(43) })
    });
    expect(reconciledAfterExpiry.statusCode).toBe(204);
    expect(wrongProofAfterExpiry.statusCode).toBe(401);
    expect(wrongProofAfterExpiry.json().code).toBe("session_expired");
  });

  it("persists a completed deletion receipt across repository reconstruction", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "restart-delete@example.com");
    const credentials = deletionCredentials();
    const committed = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(credentials)
    });
    expect(committed.statusCode).toBe(204);

    const restartedDeletionRepository = new InMemoryAccountDeletionRepository(
      api.repository,
      api.dataRepository,
      api.adminRepository
    );
    const restartedApp = buildApi({
      config: api.config,
      repository: api.repository,
      dataRepository: api.dataRepository,
      adminRepository: api.adminRepository,
      accountDeletionRepository: restartedDeletionRepository,
      emailSender: api.emailSender,
      oauthAdapters: {
        yandex: new FakeOAuthAdapter("yandex"),
        vk: new FakeOAuthAdapter("vk")
      }
    });
    const reconciled = await restartedApp.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: deletionPayload(credentials)
    });
    expect(reconciled.statusCode).toBe(204);
  });

  it("does not disclose whether an operation is unknown or has the wrong proof", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "wrong-delete-proof@example.com");
    const credentials = deletionCredentials();
    expect(
      (
        await api.app.inject({
          method: "DELETE",
          url: "/auth/account",
          headers: authHeaders(session.accessToken),
          payload: deletionPayload(credentials)
        })
      ).statusCode
    ).toBe(204);

    const wrongProof = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: deletionPayload({ ...credentials, recoverySecret: "B".repeat(43) })
    });
    const unknown = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      payload: deletionPayload(deletionCredentials())
    });
    expect({ status: wrongProof.statusCode, code: wrongProof.json().code }).toEqual({ status: 401, code: "session_expired" });
    expect({ status: unknown.statusCode, code: unknown.json().code }).toEqual({ status: 401, code: "session_expired" });
    expect(api.accountDeletionRepository.receipts.size).toBe(1);
  });

  it("rejects malformed deletion credentials without changing the account", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "malformed-delete-credentials@example.com");
    const invalidOperation = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: { confirmation: "DELETE", operationId: "not-a-uuid", recoverySecret: "A".repeat(43) }
    });
    const invalidSecret = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: { confirmation: "DELETE", operationId: randomUUID(), recoverySecret: "too-short" }
    });
    expect(invalidOperation.statusCode).toBe(400);
    expect(invalidSecret.statusCode).toBe(400);
    expect(api.repository.users.has(session.user.id)).toBe(true);
    expect(api.accountDeletionRepository.receipts.size).toBe(0);
  });

  it("serializes concurrent retries for the same deletion operation", async () => {
    let markCommitStarted!: () => void;
    let releaseCommit!: () => void;
    const commitStarted = new Promise<void>((resolve) => {
      markCommitStarted = resolve;
    });
    const commitRelease = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    let commitAttempts = 0;
    const api = createTestApi({}, {
      beforeCommit: async () => {
        commitAttempts += 1;
        markCommitStarted();
        await commitRelease;
      }
    });
    const session = await signInByEmail(api, "delete-race@example.com");
    const credentials = deletionCredentials();
    const first = api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(credentials)
    });
    await commitStarted;
    const second = api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(credentials)
    });
    releaseCommit();

    const responses = await Promise.all([first, second]);
    expect(responses.map((response) => response.statusCode)).toEqual([204, 204]);
    expect(commitAttempts).toBe(1);
    expect(api.accountDeletionRepository.receipts.size).toBe(1);
    expect(api.repository.users.has(session.user.id)).toBe(false);
  });

  it("rejects account deletion without the exact confirmation", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "confirmation@example.com");

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(deletionCredentials(), "REMOVE")
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("validation");
    expect(api.repository.users.has(session.user.id)).toBe(true);
  });

  it("rejects malformed account deletion JSON as validation without changing the account", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "malformed-delete@example.com");

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: {
        ...authHeaders(session.accessToken),
        "content-type": "application/json"
      },
      payload: "{"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("validation");
    expect(api.repository.users.has(session.user.id)).toBe(true);
  });

  it("allows a blocked user with an otherwise valid access token to delete the account", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "blocked-delete@example.com");
    await api.repository.updateUser(session.user.id, { blockedAt: new Date() });

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(deletionCredentials())
    });

    expect(response.statusCode).toBe(204);
    expect(api.repository.users.has(session.user.id)).toBe(false);
  });

  it("deletes the authenticated account graph while preserving another trainer and system exercises", async () => {
    const api = createTestApi({
      RATE_LIMIT_EMAIL_START_PER_EMAIL: "1"
    });
    const deletedSession = await signInByEmail(api, "delete-me@example.com");
    const otherSession = await signInByEmail(api, "keep-me@example.com");
    const deletedUserId = deletedSession.user.id as string;
    const otherUserId = otherSession.user.id as string;
    const systemExerciseId = seedSystemExercise(api, "system-account-deletion");
    const deletedGraph = await seedTrainerGraph(api, deletedUserId, "deleted");
    const otherGraph = await seedTrainerGraph(api, otherUserId, "other");
    const deletionCredentialsForUser = deletionCredentials();

    await api.repository.createLoginTicket({
      userId: deletedUserId,
      provider: "yandex",
      ticketHash: "deleted-user-ticket",
      expiresAt: new Date(Date.now() + 60_000)
    });
    api.adminRepository.seedTrainer({ id: deletedUserId, email: "delete-me@example.com" });
    api.adminRepository.seedTrainer({ id: otherUserId, email: "keep-me@example.com" });
    await api.adminRepository.logAudit({
      action: "trainer.block",
      targetType: "trainer",
      targetId: deletedUserId,
      metadata: { reason: "target-only" }
    });
    await api.adminRepository.logAudit({
      action: "client.viewed",
      targetType: "client",
      targetId: deletedUserId,
      metadata: { sameIdentifierDifferentTargetType: true }
    });
    await api.adminRepository.logAudit({
      action: "trainer.viewed",
      targetType: "trainer",
      targetId: otherUserId,
      metadata: { view: "detail" }
    });

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(deletedSession.accessToken),
      payload: deletionPayload(deletionCredentialsForUser)
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(api.repository.users.has(deletedUserId)).toBe(false);
    expect([...api.repository.identities.values()].some((record) => record.userId === deletedUserId)).toBe(false);
    expect([...api.repository.refreshTokens.values()].some((record) => record.userId === deletedUserId)).toBe(false);
    expect([...api.repository.loginTickets.values()].some((record) => record.userId === deletedUserId)).toBe(false);
    expect([...api.repository.emailCodes.values()].some((record) => record.email.toLowerCase() === "delete-me@example.com")).toBe(false);

    expect([...api.dataRepository.clients.values()].some((record) => record.trainerId === deletedUserId)).toBe(false);
    expect([...api.dataRepository.exercises.values()].some((record) => record.trainerId === deletedUserId)).toBe(false);
    expect([...api.dataRepository.workoutTemplates.values()].some((record) => record.trainerId === deletedUserId)).toBe(false);
    expect([...api.dataRepository.workoutSessions.values()].some((record) => record.trainerId === deletedUserId)).toBe(false);
    expect(activityEvents(api).some((record) => record.userId === deletedUserId)).toBe(false);
    expect(api.adminRepository.trainers.has(deletedUserId)).toBe(false);
    expect(api.adminRepository.auditLogs.some((record) => record.targetType === "trainer" && record.targetId === deletedUserId)).toBe(false);
    expect(api.adminRepository.auditLogs.some((record) => record.targetType === "client" && record.targetId === deletedUserId)).toBe(true);

    expect(api.repository.users.has(otherUserId)).toBe(true);
    expect(api.dataRepository.clients.has(otherGraph.clientId)).toBe(true);
    expect(api.dataRepository.exercises.has(otherGraph.exerciseId)).toBe(true);
    expect(api.dataRepository.workoutTemplates.has(otherGraph.templateId)).toBe(true);
    expect(api.dataRepository.workoutSessions.has(otherGraph.sessionId)).toBe(true);
    expect(activityEvents(api).some((record) => record.userId === otherUserId)).toBe(true);
    expect(api.adminRepository.trainers.has(otherUserId)).toBe(true);
    expect(api.adminRepository.auditLogs.some((record) => record.targetId === otherUserId)).toBe(true);
    expect(api.dataRepository.exercises.get(systemExerciseId)).toMatchObject({ trainerId: null, isSystem: true });

    await api.adminRepository.logAudit({
      action: "trainer.viewed",
      targetType: "trainer",
      targetId: deletedUserId
    });
    expect(api.adminRepository.auditLogs.some((record) => record.targetType === "trainer" && record.targetId === deletedUserId)).toBe(false);

    const oldAccess = await api.app.inject({
      method: "GET",
      url: "/me",
      headers: authHeaders(deletedSession.accessToken)
    });
    expect(oldAccess.statusCode).toBe(401);
    const oldRefresh = await api.app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: deletedSession.refreshToken }
    });
    expect(oldRefresh.statusCode).toBe(401);
    expect(oldRefresh.json().code).toBe("invalid_refresh_token");

    const recreatedSession = await signInByEmail(api, "delete-me@example.com");
    expect(recreatedSession.user.id).not.toBe(deletedUserId);
    const wrongReplayAfterRecreate = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(recreatedSession.accessToken),
      payload: deletionPayload({ ...deletionCredentialsForUser, recoverySecret: "B".repeat(43) })
    });
    expect(wrongReplayAfterRecreate.statusCode).toBe(401);
    expect(api.repository.users.has(recreatedSession.user.id)).toBe(true);
    const replayAfterRecreate = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(recreatedSession.accessToken),
      payload: deletionPayload(deletionCredentialsForUser)
    });
    expect(replayAfterRecreate.statusCode).toBe(204);
    expect(api.repository.users.has(recreatedSession.user.id)).toBe(true);
    const recreatedBootstrap = await api.app.inject({
      method: "GET",
      url: "/sync/bootstrap",
      headers: authHeaders(recreatedSession.accessToken)
    });
    expect(recreatedBootstrap.statusCode).toBe(200);
    expect(recreatedBootstrap.json().clients).toEqual([]);
    expect(recreatedBootstrap.json().workoutTemplates).toEqual([]);
    expect(recreatedBootstrap.json().workoutSessions).toEqual([]);
    expect(recreatedBootstrap.json().exercises.map((record: { id: string }) => record.id)).toContain(systemExerciseId);
    expect(recreatedBootstrap.json().exercises.map((record: { id: string }) => record.id)).not.toContain(deletedGraph.exerciseId);
  });

  it("fails closed without changing data when another active user has the same email", async () => {
    const api = createTestApi({ EMAIL_CODE_RESEND_SECONDS: "0" });
    const session = await signInByEmail(api, "duplicate@example.com");
    const targetUser = api.repository.users.get(session.user.id)!;
    api.repository.users.set("legacy-duplicate-user", {
      ...targetUser,
      id: "legacy-duplicate-user",
      email: "DUPLICATE@example.com",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await seedTrainerGraph(api, session.user.id, "duplicate-target");
    const before = snapshotDeletionStores(api);

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(session.accessToken),
      payload: deletionPayload(deletionCredentials())
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("account_conflict");
    expect(snapshotDeletionStores(api)).toEqual(before);
  });

  it.each([
    {
      name: "another trainer template referencing the target client",
      seed: async (
        api: ReturnType<typeof createTestApi>,
        targetGraph: Awaited<ReturnType<typeof seedTrainerGraph>>,
        otherUserId: string
      ) => {
        await api.dataRepository.createWorkoutTemplate(otherUserId, {
          clientId: targetGraph.clientId,
          title: "foreign client reference"
        });
      }
    },
    {
      name: "another trainer template referencing the target exercise",
      seed: async (
        api: ReturnType<typeof createTestApi>,
        targetGraph: Awaited<ReturnType<typeof seedTrainerGraph>>,
        otherUserId: string
      ) => {
        await api.dataRepository.createWorkoutTemplate(otherUserId, {
          title: "foreign exercise reference",
          items: [{ exerciseId: targetGraph.exerciseId, order: 0, titleSnapshot: "foreign exercise" }]
        });
      }
    },
    {
      name: "another trainer session referencing the target client",
      seed: async (
        api: ReturnType<typeof createTestApi>,
        targetGraph: Awaited<ReturnType<typeof seedTrainerGraph>>,
        otherUserId: string
      ) => {
        await api.dataRepository.createWorkoutSession(otherUserId, {
          clientId: targetGraph.clientId,
          title: "foreign client session"
        });
      }
    },
    {
      name: "another trainer session referencing the target template",
      seed: async (
        api: ReturnType<typeof createTestApi>,
        targetGraph: Awaited<ReturnType<typeof seedTrainerGraph>>,
        otherUserId: string
      ) => {
        await api.dataRepository.createWorkoutSession(otherUserId, {
          workoutTemplateId: targetGraph.templateId,
          title: "foreign template session"
        });
      }
    },
    {
      name: "another trainer session referencing the target exercise",
      seed: async (
        api: ReturnType<typeof createTestApi>,
        targetGraph: Awaited<ReturnType<typeof seedTrainerGraph>>,
        otherUserId: string
      ) => {
        await api.dataRepository.createWorkoutSession(otherUserId, {
          title: "foreign exercise session",
          items: [{ exerciseId: targetGraph.exerciseId, order: 0, titleSnapshot: "foreign exercise" }]
        });
      }
    }
  ])("fails closed without changing data for $name", async ({ seed }) => {
    const api = createTestApi({ EMAIL_CODE_RESEND_SECONDS: "0" });
    const targetSession = await signInByEmail(api, "cross-owner-target@example.com");
    const otherSession = await signInByEmail(api, "cross-owner-other@example.com");
    const targetGraph = await seedTrainerGraph(api, targetSession.user.id, "cross-owner-target");
    await seed(api, targetGraph, otherSession.user.id);
    const before = snapshotDeletionStores(api);

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(targetSession.accessToken),
      payload: deletionPayload(deletionCredentials())
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("account_conflict");
    expect(snapshotDeletionStores(api)).toEqual(before);
  });

  it("does not overwrite a new in-memory user created after deletion starts", async () => {
    const api = createTestApi();
    const session = await signInByEmail(api, "atomic-in-memory@example.com");

    const credentials = deletionCredentials();
    const deletion = api.accountDeletionRepository.deleteAccount(
      session.user.id,
      credentials.operationId,
      "test-proof-hash",
      new Date(Date.now() + 60_000)
    );
    const concurrentUser = await api.repository.createUser({ email: "concurrent@example.com" });
    await deletion;

    expect(api.repository.users.has(session.user.id)).toBe(false);
    expect(api.repository.users.get(concurrentUser.id)).toEqual(concurrentUser);
  });

  it("retries a raw-query Prisma serialization conflict before reporting deletion success", async () => {
    let attempts = 0;
    const fakePrisma = {
      async $transaction() {
        attempts += 1;
        if (attempts === 1) {
          throw Object.assign(new Error("raw query serialization conflict"), {
            code: "P2010",
            meta: { code: "40001" }
          });
        }
        return { email: "retry@example.com", alreadyCompleted: false };
      }
    };
    const repository = new PrismaAccountDeletionRepository(fakePrisma as never);

    await expect(
      repository.deleteAccount(
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
        "test-proof-hash",
        new Date(Date.now() + 60_000)
      )
    ).resolves.toEqual({
      email: "retry@example.com",
      alreadyCompleted: false
    });
    expect(attempts).toBe(2);
  });

  it("keeps an expired Prisma deletion receipt reconcilable only with the correct proof", async () => {
    const receipt = {
      operationId: "00000000-0000-4000-8000-000000000002",
      recoverySecretHash: "correct-proof-hash",
      createdAt: new Date(0),
      completedAt: new Date(0),
      expiresAt: new Date(0)
    };
    const fakePrisma = {
      async $transaction(callback: (transaction: unknown) => Promise<unknown>) {
        return callback({
          $queryRaw: async () => [],
          accountDeletionReceipt: {
            findUnique: async () => receipt
          }
        });
      }
    };
    const repository = new PrismaAccountDeletionRepository(fakePrisma as never);

    await expect(
      repository.deleteAccount(
        "00000000-0000-4000-8000-000000000001",
        receipt.operationId,
        receipt.recoverySecretHash,
        new Date(0)
      )
    ).resolves.toEqual({ email: null, alreadyCompleted: true });
    await expect(
      repository.deleteAccount(
        "00000000-0000-4000-8000-000000000001",
        receipt.operationId,
        "wrong-proof-hash",
        new Date(0)
      )
    ).rejects.toMatchObject({ code: "session_expired", statusCode: 401 });
  });

  it("rolls back every account-owned store when deletion fails before commit", async () => {
    let failureInjected = false;
    const api = createTestApi(
      { EMAIL_CODE_RESEND_SECONDS: "0" },
      {
        beforeCommit: () => {
          failureInjected = true;
          throw new Error("forced account deletion rollback");
        }
      }
    );
    const deletedSession = await signInByEmail(api, "rollback@example.com");
    const otherSession = await signInByEmail(api, "rollback-other@example.com");
    const deletedUserId = deletedSession.user.id as string;
    const otherUserId = otherSession.user.id as string;
    seedSystemExercise(api, "system-rollback");
    await seedTrainerGraph(api, deletedUserId, "rollback-target");
    await seedTrainerGraph(api, otherUserId, "rollback-other");
    api.adminRepository.seedTrainer({ id: deletedUserId, email: "rollback@example.com" });
    api.adminRepository.seedTrainer({ id: otherUserId, email: "rollback-other@example.com" });
    await api.adminRepository.logAudit({
      action: "trainer.sessions_revoked",
      targetType: "trainer",
      targetId: deletedUserId,
      metadata: { revokedSessions: 1 }
    });
    const before = snapshotDeletionStores(api);

    const response = await api.app.inject({
      method: "DELETE",
      url: "/auth/account",
      headers: authHeaders(deletedSession.accessToken),
      payload: deletionPayload(deletionCredentials())
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().code).toBe("server_error");
    expect(failureInjected).toBe(true);
    expect(snapshotDeletionStores(api)).toEqual(before);

    const oldAccess = await api.app.inject({
      method: "GET",
      url: "/me",
      headers: authHeaders(deletedSession.accessToken)
    });
    expect(oldAccess.statusCode).toBe(200);
    const oldRefresh = await api.app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: deletedSession.refreshToken }
    });
    expect(oldRefresh.statusCode).toBe(200);
  });
});

async function signInByEmail(api: ReturnType<typeof createTestApi>, email = "trainer@example.com") {
  const { app, emailSender } = api;
  const started = await app.inject({ method: "POST", url: "/auth/email/start", payload: { email } });
  expect(started.statusCode).toBe(200);
  const code = emailSender.sent.at(-1)?.code;
  expect(code).toBeTruthy();
  const verified = await app.inject({ method: "POST", url: "/auth/email/verify", payload: { email, code } });
  expect(verified.statusCode).toBe(200);
  return verified.json();
}

function authHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

function deletionCredentials() {
  return {
    operationId: randomUUID(),
    recoverySecret: "A".repeat(43)
  };
}

function deletionPayload(credentials: ReturnType<typeof deletionCredentials>, confirmation = "DELETE") {
  return { confirmation, ...credentials };
}

function seedSystemExercise(api: ReturnType<typeof createTestApi>, id: string) {
  const now = new Date();
  api.dataRepository.exercises.set(id, {
    id,
    trainerId: null,
    name: "System exercise",
    muscleGroup: "all",
    equipment: null,
    description: null,
    isSystem: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  });
  return id;
}

async function seedTrainerGraph(api: ReturnType<typeof createTestApi>, trainerId: string, prefix: string) {
  const client = await api.dataRepository.createClient(trainerId, { name: `${prefix} client` });
  const exercise = await api.dataRepository.createExercise(trainerId, { name: `${prefix} exercise` });
  const template = await api.dataRepository.createWorkoutTemplate(trainerId, {
    clientId: client.id,
    title: `${prefix} template`,
    items: [{ exerciseId: exercise.id, order: 0, titleSnapshot: `${prefix} exercise` }]
  });
  const session = await api.dataRepository.createWorkoutSession(trainerId, {
    clientId: client.id,
    workoutTemplateId: template.id,
    title: `${prefix} session`,
    items: [{ exerciseId: exercise.id, order: 0, titleSnapshot: `${prefix} exercise` }]
  });
  await api.dataRepository.updateWorkoutResults(trainerId, session.id, [
    {
      id: session.items[0].id,
      setResults: [{ setNumber: 1, reps: 8, completed: true }]
    }
  ]);
  await api.dataRepository.logActivity(trainerId, "workout_session.completed", "workout_session", session.id);
  return { clientId: client.id, exerciseId: exercise.id, templateId: template.id, sessionId: session.id };
}

function activityEvents(api: ReturnType<typeof createTestApi>) {
  return api.dataRepository.activityEvents as Array<{ userId: string | null; type: string; entityType?: string; entityId?: string }>;
}

function snapshotDeletionStores(api: ReturnType<typeof createTestApi>) {
  return structuredClone({
    users: [...api.repository.users.entries()],
    identities: [...api.repository.identities.entries()],
    emailCodes: [...api.repository.emailCodes.entries()],
    refreshTokens: [...api.repository.refreshTokens.entries()],
    oauthStates: [...api.repository.oauthStates.entries()],
    loginTickets: [...api.repository.loginTickets.entries()],
    clients: [...api.dataRepository.clients.entries()],
    exercises: [...api.dataRepository.exercises.entries()],
    workoutTemplates: [...api.dataRepository.workoutTemplates.entries()],
    workoutSessions: [...api.dataRepository.workoutSessions.entries()],
    activityEvents: api.dataRepository.activityEvents,
    adminTrainers: [...api.adminRepository.trainers.entries()],
    adminAuditLogs: api.adminRepository.auditLogs,
    accountDeletionReceipts: [...api.accountDeletionRepository.receipts.entries()]
  });
}
