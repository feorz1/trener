import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Socket } from "node:net";
import type { AuthServerConfig } from "../config";
import { AuthApiError } from "../errors";
import type { AuthProvider } from "../types";
import type { AdminService } from "./AdminService";
import type { AdminRepository, TimeseriesMetric, TimeseriesRange } from "./types";

type RegisterAdminRoutesInput = {
  app: FastifyInstance;
  config: AuthServerConfig;
  service: AdminService;
  repository: AdminRepository;
};

export function registerAdminRoutes({ app, config, service, repository }: RegisterAdminRoutesInput) {
  const cookieOptions = cookieAttributes(config);

  app.post("/admin/auth/login", async (request, reply) => {
    const body = readBody(request);
    const result = await service.login(requiredString(body.email), requiredString(body.password), requestMeta(request));
    setCookie(reply, config.admin.cookieName, result.sessionToken, cookieOptions);
    setCookie(reply, config.admin.csrfCookieName, result.csrfToken, { ...cookieOptions, httpOnly: false });
    return {
      admin: result.admin,
      csrfToken: result.csrfToken,
      expiresAt: result.expiresAt.toISOString()
    };
  });

  app.post("/admin/auth/logout", async (request, reply) => {
    const response = await service.logout(readSessionCookie(request, config), readCsrfToken(request, config), requestMeta(request));
    clearCookie(reply, config.admin.cookieName, cookieOptions);
    clearCookie(reply, config.admin.csrfCookieName, { ...cookieOptions, httpOnly: false });
    return response;
  });

  app.get("/admin/auth/me", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config));
    return service.toPublicAdmin(admin);
  });

  app.get("/admin/stats/overview", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    return repository.getOverviewStats(new Date());
  });

  app.get<{ Querystring: { metric?: string; range?: string; bucket?: string } }>("/admin/stats/timeseries", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    const metric = readMetric(request.query.metric);
    const range = readRange(request.query.range);
    const days = range === "90d" ? 90 : range === "7d" ? 7 : 30;
    return {
      metric,
      range,
      bucket: "day",
      points: await repository.getTimeseries(metric, days, new Date())
    };
  });

  app.get("/admin/trainers", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    const query = readQuery(request);
    return repository.listTrainers({
      search: optionalString(query.search),
      provider: readProvider(query.provider),
      status: readStatus(query.status),
      registeredFrom: optionalDate(query.registeredFrom),
      registeredTo: optionalDate(query.registeredTo),
      sort: readTrainerSort(query.sort),
      order: readOrder(query.order),
      page: readPage(query.page),
      pageSize: readPageSize(query.pageSize)
    });
  });

  app.get<{ Params: { id: string } }>("/admin/trainers/:id/clients", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config));
    const items = await repository.listTrainerClients(request.params.id);
    await service.audit(admin.id, "trainer.viewed", "trainer", request.params.id, { view: "clients" }, requestMeta(request));
    return { data: items };
  });

  app.get<{ Params: { id: string } }>("/admin/trainers/:id/workouts", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config));
    const items = await repository.listTrainerWorkouts(request.params.id);
    await service.audit(admin.id, "trainer.viewed", "trainer", request.params.id, { view: "workouts" }, requestMeta(request));
    return { data: items };
  });

  app.get<{ Params: { id: string } }>("/admin/trainers/:id", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config));
    const trainer = await repository.getTrainerDetail(request.params.id);
    if (!trainer) throw new AuthApiError("not_found", 404);
    await service.audit(admin.id, "trainer.viewed", "trainer", request.params.id, { view: "detail" }, requestMeta(request));
    return trainer;
  });

  app.post<{ Params: { id: string } }>("/admin/trainers/:id/block", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config), readCsrfToken(request, config), true);
    service.assertDangerousRole(admin);
    const body = readBody(request);
    const trainer = await repository.setTrainerBlocked(request.params.id, true, optionalString(body.reason) ?? "admin_action");
    if (!trainer) throw new AuthApiError("not_found", 404);
    const revokedSessions = await repository.revokeTrainerSessions(request.params.id);
    await service.audit(admin.id, "trainer.block", "trainer", request.params.id, { reason: optionalString(body.reason), revokedSessions }, requestMeta(request));
    return { ok: true, trainer, revokedSessions };
  });

  app.post<{ Params: { id: string } }>("/admin/trainers/:id/unblock", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config), readCsrfToken(request, config), true);
    service.assertDangerousRole(admin);
    const trainer = await repository.setTrainerBlocked(request.params.id, false);
    if (!trainer) throw new AuthApiError("not_found", 404);
    await service.audit(admin.id, "trainer.unblock", "trainer", request.params.id, null, requestMeta(request));
    return { ok: true, trainer };
  });

  app.post<{ Params: { id: string } }>("/admin/trainers/:id/revoke-sessions", async (request) => {
    const { admin } = await service.requireSession(readSessionCookie(request, config), readCsrfToken(request, config), true);
    service.assertDangerousRole(admin);
    const revokedSessions = await repository.revokeTrainerSessions(request.params.id);
    await service.audit(admin.id, "trainer.sessions_revoked", "trainer", request.params.id, { revokedSessions }, requestMeta(request));
    return { ok: true, revokedSessions };
  });

  app.get("/admin/security/auth-events", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    return repository.listAuthEvents();
  });

  app.get("/admin/security/suspicious-sessions", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    return { data: await repository.listSuspiciousSessions() };
  });

  app.get("/admin/system/health", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    let databaseStatus: "ok" | "error" = "ok";
    try {
      await repository.ready();
    } catch {
      databaseStatus = "error";
    }
    return {
      api: "ok",
      database: databaseStatus,
      redis: await checkRedisStatus(process.env.REDIS_URL),
      serverTime: new Date().toISOString(),
      appVersion: process.env.npm_package_version ?? "0.1.0",
      lastBackupAt: process.env.LAST_BACKUP_AT ?? null
    };
  });

  app.get("/admin/audit-log", async (request) => {
    await service.requireSession(readSessionCookie(request, config));
    const query = readQuery(request);
    return repository.listAuditLog(readPage(query.page), readPageSize(query.pageSize));
  });
}

async function checkRedisStatus(redisUrl: string | undefined) {
  if (!redisUrl) return "not_configured";
  try {
    const url = new URL(redisUrl);
    const port = Number.parseInt(url.port || "6379", 10);
    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error("redis timeout"));
      }, 1000);
      socket.once("error", reject);
      socket.connect(port, url.hostname, () => {
        clearTimeout(timer);
        socket.end();
        resolve();
      });
    });
    return "ok";
  } catch {
    return "error";
  }
}

function requestMeta(request: FastifyRequest) {
  return {
    ip: request.ip,
    userAgent: request.headers["user-agent"] ?? null
  };
}

function readBody(request: FastifyRequest) {
  return (request.body ?? {}) as Record<string, unknown>;
}

function readQuery(request: FastifyRequest) {
  return request.query as Record<string, unknown>;
}

function requiredString(value: unknown) {
  if (typeof value !== "string" || value.length === 0) throw new AuthApiError("validation", 400);
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new AuthApiError("validation", 400);
  return parsed;
}

function readMetric(value: unknown): TimeseriesMetric {
  if (value === "workouts_completed" || value === "active_trainers") return value;
  return "trainers_new";
}

function readRange(value: unknown): TimeseriesRange {
  if (value === "7d" || value === "90d") return value;
  return "30d";
}

function readProvider(value: unknown): AuthProvider | undefined {
  if (value === "email" || value === "yandex" || value === "vk") return value;
  return undefined;
}

function readStatus(value: unknown): "active" | "blocked" | undefined {
  if (value === "active" || value === "blocked") return value;
  return undefined;
}

function readTrainerSort(value: unknown): "createdAt" | "lastSeenAt" | "clientsCount" | "workoutsCount" | undefined {
  if (value === "lastSeenAt" || value === "clientsCount" || value === "workoutsCount") return value;
  return "createdAt";
}

function readOrder(value: unknown): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function readPage(value: unknown) {
  return clampInteger(value, 1, 10_000, 1);
}

function readPageSize(value: unknown) {
  return clampInteger(value, 1, 100, 50);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readSessionCookie(request: FastifyRequest, config: AuthServerConfig) {
  return parseCookies(request.headers.cookie)[config.admin.cookieName] ?? null;
}

function readCsrfToken(request: FastifyRequest, config: AuthServerConfig) {
  const header = request.headers["x-csrf-token"];
  return typeof header === "string" ? header : parseCookies(request.headers.cookie)[config.admin.csrfCookieName] ?? null;
}

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name || rest.length === 0) continue;
    cookies[name] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

function cookieAttributes(config: AuthServerConfig) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "Lax" as const,
    path: "/admin",
    maxAge: config.admin.sessionTtlDays * 24 * 60 * 60
  };
}

function setCookie(reply: FastifyReply, name: string, value: string, options: ReturnType<typeof cookieAttributes>) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path}`, `Max-Age=${options.maxAge}`, `SameSite=${options.sameSite}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  reply.header("Set-Cookie", appendHeader(reply, parts.join("; ")));
}

function clearCookie(reply: FastifyReply, name: string, options: ReturnType<typeof cookieAttributes>) {
  const parts = [`${name}=`, `Path=${options.path}`, "Max-Age=0", `SameSite=${options.sameSite}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  reply.header("Set-Cookie", appendHeader(reply, parts.join("; ")));
}

function appendHeader(reply: FastifyReply, value: string) {
  const existing = reply.getHeader("Set-Cookie");
  if (!existing) return value;
  return Array.isArray(existing) ? [...existing, value] : [existing.toString(), value];
}
