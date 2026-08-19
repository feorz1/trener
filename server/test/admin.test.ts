import { describe, expect, it } from "vitest";
import { loadAuthConfig } from "../src/config";
import { buildApi } from "../src/app";
import { InMemoryAuthRepository } from "../src/repositories/InMemoryAuthRepository";
import { InMemoryAdminRepository } from "../src/admin/InMemoryAdminRepository";
import { AdminService } from "../src/admin/AdminService";
import { InMemoryTrainerDataRepository } from "../src/data/InMemoryTrainerDataRepository";
import { InMemoryAccountDeletionRepository } from "../src/accountDeletion/InMemoryAccountDeletionRepository";
import type { EmailSender, NormalizedOAuthProfile, OAuthProvider, OAuthProviderAdapter } from "../src/types";

class CapturingEmailSender implements EmailSender {
  sent: Array<{ email: string; code: string; ttlSeconds: number }> = [];

  async sendLoginCode(params: { email: string; code: string; ttlSeconds: number }) {
    this.sent.push(params);
  }
}

class FakeOAuthAdapter implements OAuthProviderAdapter {
  constructor(readonly provider: OAuthProvider) {}

  async getAuthorizationUrl(params: { state: string; redirectUri: string }) {
    const url = new URL(`https://${this.provider}.example/authorize`);
    url.searchParams.set("state", params.state);
    url.searchParams.set("redirect_uri", params.redirectUri);
    return url.toString();
  }

  async exchangeCode() {
    return { access_token: `${this.provider}-token` };
  }

  async getProfile(): Promise<NormalizedOAuthProfile> {
    return { provider: this.provider, subject: `${this.provider}-subject` };
  }
}

function createTestApi(env: NodeJS.ProcessEnv = {}) {
  const config = loadAuthConfig({
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: "test_access_secret_12345678901234567890",
    REFRESH_TOKEN_PEPPER: "test_refresh_pepper_123456789012345",
    EMAIL_CODE_PEPPER: "test_email_code_pepper_12345678901",
    LOGIN_TICKET_PEPPER: "test_login_ticket_pepper_123456789",
    OAUTH_STATE_ENCRYPTION_SECRET: "test_oauth_state_secret_12345678901",
    ADMIN_SESSION_PEPPER: "test_admin_session_pepper_1234567890",
    YANDEX_CLIENT_ID: "yandex-client",
    YANDEX_CLIENT_SECRET: "yandex-secret",
    VK_CLIENT_ID: "vk-client",
    VK_CLIENT_SECRET: "vk-secret",
    ...env
  });
  const authRepository = new InMemoryAuthRepository();
  const dataRepository = new InMemoryTrainerDataRepository();
  const adminRepository = new InMemoryAdminRepository();
  const accountDeletionRepository = new InMemoryAccountDeletionRepository(authRepository, dataRepository, adminRepository);
  const emailSender = new CapturingEmailSender();
  const app = buildApi({
    config,
    repository: authRepository,
    dataRepository,
    adminRepository,
    accountDeletionRepository,
    emailSender,
    oauthAdapters: {
      yandex: new FakeOAuthAdapter("yandex"),
      vk: new FakeOAuthAdapter("vk")
    }
  });
  return { app, config, authRepository, adminRepository, emailSender };
}

describe("admin backend", () => {
  it("logs in with HttpOnly cookie and serves /admin/auth/me", async () => {
    const api = createTestApi();
    await seedAdmin(api);

    const login = await api.app.inject({ method: "POST", url: "/admin/auth/login", payload: { email: "OWNER@example.com", password: "owner-password-123" } });
    expect(login.statusCode).toBe(200);
    expect(login.json().admin).toMatchObject({ email: "Owner@example.com", role: "OWNER" });
    expect(JSON.stringify(login.json())).not.toContain("sessionToken");
    expect(setCookies(login).some((cookie) => cookie.includes("admin_session=") && cookie.includes("HttpOnly"))).toBe(true);

    const me = await api.app.inject({ method: "GET", url: "/admin/auth/me", headers: { cookie: cookieHeader(login) } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: "Owner@example.com", role: "OWNER" });
  });

  it("uses generic login errors and rate-limits login", async () => {
    const api = createTestApi({ ADMIN_LOGIN_RATE_LIMIT_MAX: "2" });
    await seedAdmin(api);

    const wrong = await api.app.inject({ method: "POST", url: "/admin/auth/login", payload: { email: "owner@example.com", password: "wrong-password-123" } });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json().message).toBe("Неверная почта или пароль");

    await api.app.inject({ method: "POST", url: "/admin/auth/login", payload: { email: "missing@example.com", password: "wrong-password-123" } });
    const limited = await api.app.inject({ method: "POST", url: "/admin/auth/login", payload: { email: "missing@example.com", password: "wrong-password-123" } });
    expect(limited.statusCode).toBe(429);
  });

  it("keeps auth and admin rate-limit buckets separate and honors trusted client IPs", async () => {
    const api = createTestApi({
      TRUSTED_PROXY_CIDRS: "10.0.0.2/32",
      ADMIN_LOGIN_RATE_LIMIT_MAX: "1",
      RATE_LIMIT_EMAIL_START_PER_EMAIL: "10",
      RATE_LIMIT_EMAIL_START_PER_IP: "1",
      EMAIL_CODE_RESEND_SECONDS: "0"
    });
    await seedAdmin(api);
    const proxyHeaders = (clientIp: string) => ({ "x-forwarded-for": clientIp });

    const authAttempt = await api.app.inject({
      method: "POST",
      url: "/auth/email/start",
      remoteAddress: "10.0.0.2",
      headers: proxyHeaders("198.51.100.1"),
      payload: { email: "rate-auth@example.com" }
    });
    expect(authAttempt.statusCode).toBe(200);

    const firstAdmin = await api.app.inject({
      method: "POST",
      url: "/admin/auth/login",
      remoteAddress: "10.0.0.2",
      headers: proxyHeaders("198.51.100.1"),
      payload: { email: "owner@example.com", password: "wrong-password-123" }
    });
    expect(firstAdmin.statusCode).toBe(401);

    const otherClient = await api.app.inject({
      method: "POST",
      url: "/admin/auth/login",
      remoteAddress: "10.0.0.2",
      headers: proxyHeaders("203.0.113.2"),
      payload: { email: "owner@example.com", password: "wrong-password-123" }
    });
    expect(otherClient.statusCode).toBe(401);

    const repeatedAdmin = await api.app.inject({
      method: "POST",
      url: "/admin/auth/login",
      remoteAddress: "10.0.0.2",
      headers: proxyHeaders("198.51.100.1"),
      payload: { email: "owner@example.com", password: "wrong-password-123" }
    });
    expect(repeatedAdmin.statusCode).toBe(429);
  });

  it("requires an admin cookie and rejects trainer bearer tokens", async () => {
    const api = createTestApi();
    await seedAdmin(api);
    const trainer = await signInTrainer(api);

    const missing = await api.app.inject({ method: "GET", url: "/admin/stats/overview" });
    expect(missing.statusCode).toBe(401);

    const bearer = await api.app.inject({ method: "GET", url: "/admin/stats/overview", headers: { authorization: `Bearer ${trainer.accessToken}` } });
    expect(bearer.statusCode).toBe(401);
  });

  it("serves stats, trainers list, trainer detail, and hides sensitive fields", async () => {
    const api = createTestApi();
    await seedAdmin(api);
    const trainer = api.adminRepository.seedTrainer({
      email: "trainer@example.com",
      clients: [
        {
          id: "client-1",
          name: "Клиент",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          workoutsCount: 2,
          lastWorkoutAt: new Date().toISOString(),
          status: "active"
        }
      ]
    });
    const session = await loginAdmin(api);

    const stats = await api.app.inject({ method: "GET", url: "/admin/stats/overview", headers: { cookie: session.cookie } });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().trainersTotal).toBe(1);

    const list = await api.app.inject({ method: "GET", url: "/admin/trainers?page=1&pageSize=10&search=trainer", headers: { cookie: session.cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json().data[0]).toMatchObject({ email: "trainer@example.com", clientsCount: 1 });
    expect(JSON.stringify(list.json())).not.toContain("passwordHash");

    const detail = await api.app.inject({ method: "GET", url: `/admin/trainers/${trainer.id}`, headers: { cookie: session.cookie } });
    expect(detail.statusCode).toBe(200);

    const clients = await api.app.inject({ method: "GET", url: `/admin/trainers/${trainer.id}/clients`, headers: { cookie: session.cookie } });
    expect(clients.statusCode).toBe(200);
    expect(JSON.stringify(clients.json())).not.toContain("phone");
    expect(JSON.stringify(clients.json())).not.toContain("email");
  });

  it("allows OWNER/ADMIN actions, blocks READ_ONLY, revokes sessions, and writes audit log", async () => {
    const api = createTestApi();
    await seedAdmin(api, "owner@example.com", "owner-password-123", "OWNER");
    await seedAdmin(api, "readonly@example.com", "readonly-password-123", "READ_ONLY");
    const trainer = api.adminRepository.seedTrainer();

    const readOnly = await loginAdmin(api, "readonly@example.com", "readonly-password-123");
    const denied = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: { cookie: readOnly.cookie, "x-csrf-token": readOnly.csrfToken },
      payload: { reason: "test" }
    });
    expect(denied.statusCode).toBe(403);

    const owner = await loginAdmin(api, "owner@example.com", "owner-password-123");
    const blocked = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrfToken },
      payload: { reason: "policy" }
    });
    expect(blocked.statusCode).toBe(200);
    expect(blocked.json().trainer.isBlocked).toBe(true);
    expect(blocked.json().revokedSessions).toBe(1);

    const audit = await api.app.inject({ method: "GET", url: "/admin/audit-log", headers: { cookie: owner.cookie } });
    expect(audit.statusCode).toBe(200);
    expect(audit.json().data.some((item: { action: string }) => item.action === "trainer.block")).toBe(true);

    const unblocked = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/unblock`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrfToken, "content-type": "application/json" },
      payload: ""
    });
    expect(unblocked.statusCode).toBe(200);
    expect(unblocked.json().trainer.isBlocked).toBe(false);

    const revokedAgain = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/revoke-sessions`,
      headers: { cookie: owner.cookie, "x-csrf-token": owner.csrfToken, "content-type": "application/json" },
      payload: ""
    });
    expect(revokedAgain.statusCode).toBe(200);
    expect(revokedAgain.json().revokedSessions).toBe(0);

    const missingAuditAuth = await api.app.inject({ method: "GET", url: "/admin/audit-log" });
    expect(missingAuditAuth.statusCode).toBe(401);
  });

  it("requires a matching CSRF header and trusted browser origin for every admin mutation", async () => {
    const api = createTestApi({ ADMIN_CORS_ORIGIN: "https://admin.example.com" });
    await seedAdmin(api);
    const trainer = api.adminRepository.seedTrainer();

    const foreignLogin = await api.app.inject({
      method: "POST",
      url: "/admin/auth/login",
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      payload: { email: "owner@example.com", password: "owner-password-123" }
    });
    expect(foreignLogin.statusCode).toBe(403);

    const session = await loginAdmin(api);
    const trustedBrowserHeaders = {
      cookie: session.cookie,
      origin: "https://admin.example.com",
      "sec-fetch-site": "same-site"
    };

    const cookieOnlyText = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: { ...trustedBrowserHeaders, "content-type": "text/plain" },
      payload: "reason=csrf"
    });
    expect(cookieOnlyText.statusCode).toBe(403);

    const missingHeaderJson = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: trustedBrowserHeaders,
      payload: { reason: "csrf" }
    });
    expect(missingHeaderJson.statusCode).toBe(403);

    const wrongHeader = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: { ...trustedBrowserHeaders, "x-csrf-token": "wrong-token" },
      payload: { reason: "csrf" }
    });
    expect(wrongHeader.statusCode).toBe(403);

    const foreignOrigin = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: {
        cookie: session.cookie,
        origin: "https://evil.example",
        "sec-fetch-site": "same-site",
        "x-csrf-token": session.csrfToken
      },
      payload: { reason: "csrf" }
    });
    expect(foreignOrigin.statusCode).toBe(403);

    const crossSite = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: {
        ...trustedBrowserHeaders,
        "sec-fetch-site": "cross-site",
        "x-csrf-token": session.csrfToken
      },
      payload: { reason: "csrf" }
    });
    expect(crossSite.statusCode).toBe(403);

    const allowed = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/block`,
      headers: { ...trustedBrowserHeaders, "x-csrf-token": session.csrfToken },
      payload: { reason: "policy" }
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().trainer.isBlocked).toBe(true);

    for (const url of [
      `/admin/trainers/${trainer.id}/unblock`,
      `/admin/trainers/${trainer.id}/revoke-sessions`,
      "/admin/auth/logout"
    ]) {
      const cookieOnly = await api.app.inject({ method: "POST", url, headers: trustedBrowserHeaders, payload: "" });
      expect(cookieOnly.statusCode).toBe(403);
    }

    const headMutation = await api.app.inject({
      method: "HEAD",
      url: `/admin/trainers/${trainer.id}/unblock`,
      headers: { ...trustedBrowserHeaders, "x-csrf-token": session.csrfToken }
    });
    expect(headMutation.statusCode).toBe(404);
    expect((await api.adminRepository.getTrainerDetail(trainer.id))?.isBlocked).toBe(true);

    const unblocked = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/unblock`,
      headers: { ...trustedBrowserHeaders, "x-csrf-token": session.csrfToken },
      payload: ""
    });
    expect(unblocked.statusCode).toBe(200);

    const revoked = await api.app.inject({
      method: "POST",
      url: `/admin/trainers/${trainer.id}/revoke-sessions`,
      headers: { ...trustedBrowserHeaders, "x-csrf-token": session.csrfToken },
      payload: ""
    });
    expect(revoked.statusCode).toBe(200);

    const logout = await api.app.inject({
      method: "POST",
      url: "/admin/auth/logout",
      headers: { ...trustedBrowserHeaders, "x-csrf-token": session.csrfToken },
      payload: ""
    });
    expect(logout.statusCode).toBe(200);
  });
});

async function seedAdmin(api: ReturnType<typeof createTestApi>, email = "Owner@example.com", password = "owner-password-123", role: "OWNER" | "ADMIN" | "SUPPORT" | "READ_ONLY" = "OWNER") {
  const service = new AdminService(api.config, api.adminRepository);
  return service.createInitialAdmin(email, password, role);
}

async function loginAdmin(api: ReturnType<typeof createTestApi>, email = "owner@example.com", password = "owner-password-123") {
  const response = await api.app.inject({ method: "POST", url: "/admin/auth/login", payload: { email, password } });
  expect(response.statusCode).toBe(200);
  return { cookie: cookieHeader(response), csrfToken: response.json().csrfToken as string };
}

async function signInTrainer(api: ReturnType<typeof createTestApi>, email = "trainer-auth@example.com") {
  await api.app.inject({ method: "POST", url: "/auth/email/start", payload: { email } });
  const code = api.emailSender.sent.at(-1)?.code;
  const verified = await api.app.inject({ method: "POST", url: "/auth/email/verify", payload: { email, code } });
  expect(verified.statusCode).toBe(200);
  return verified.json();
}

function setCookies(response: { headers: Record<string, unknown> }) {
  const value = response.headers["set-cookie"];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cookieHeader(response: { headers: Record<string, unknown> }) {
  return setCookies(response)
    .map((cookie) => String(cookie).split(";")[0])
    .join("; ");
}
