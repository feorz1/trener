import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { isIP } from "node:net";
import type { AuthServerConfig } from "./config";
import { AuthApiError, toErrorPayload } from "./errors";
import { hashSecret } from "./security";
import { AuthService } from "./services/authService";
import type { EmailSender, OAuthProvider, OAuthProviderAdapter } from "./types";
import type { AuthRepository } from "./repositories/AuthRepository";
import { InMemoryTrainerDataRepository } from "./data/InMemoryTrainerDataRepository";
import { registerTrainerDataRoutes } from "./data/routes";
import type { TrainerDataRepository } from "./data/types";
import { AdminService } from "./admin/AdminService";
import { createAdminRepository } from "./admin/createAdminRepository";
import { registerAdminRoutes } from "./admin/routes";
import type { AdminRepository } from "./admin/types";
import type { AccountDeletionRepository } from "./accountDeletion/types";
import { registerPublicInformationRoutes } from "./publicInformationRoutes";

type BuildApiInput = {
  config: AuthServerConfig;
  repository: AuthRepository;
  emailSender: EmailSender;
  oauthAdapters: Record<OAuthProvider, OAuthProviderAdapter>;
  accountDeletionRepository: AccountDeletionRepository;
  dataRepository?: TrainerDataRepository;
  adminRepository?: AdminRepository;
};

export function buildApi({ config, repository, emailSender, oauthAdapters, accountDeletionRepository, dataRepository, adminRepository }: BuildApiInput) {
  const app = Fastify({
    trustProxy: config.trustedProxyCidrs.length > 0 ? config.trustedProxyCidrs : false,
    logger: config.isProduction
      ? {
          level: "info",
          redact: [
            "req.url",
            "req.headers.authorization",
            "req.body.refreshToken",
            "req.body.code",
            "req.body.ticket",
            "req.body.recoverySecret"
          ]
        }
      : false
  });
  const authService = new AuthService(config, repository, accountDeletionRepository, emailSender, oauthAdapters);
  const trainerDataRepository = dataRepository ?? new InMemoryTrainerDataRepository();
  const resolvedAdminRepository = adminRepository ?? createAdminRepository(config);
  const adminService = new AdminService(config, resolvedAdminRepository);

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    const rawBody = typeof body === "string" ? body : body.toString("utf8");
    if (rawBody.length === 0) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(rawBody));
    } catch {
      done(new AuthApiError("validation", 400));
    }
  });

  void app.register(cors, {
    origin: config.isProduction ? [...config.corsOrigins, config.admin.corsOrigin] : true,
    credentials: true
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AuthApiError) {
      logSanitizedError(app, request, error.code, error.statusCode);
      void reply.status(error.statusCode).send(toErrorPayload(error));
      return;
    }
    logSanitizedError(app, request, "server_error", 500);
    const message = error instanceof Error ? error.message : undefined;
    const payload = toErrorPayload(new AuthApiError("server_error", 500, config.isProduction ? undefined : message));
    void reply.status(500).send(payload);
  });

  app.get("/health", async () => ({
    ok: true,
    service: "api",
    time: new Date().toISOString()
  }));

  registerPublicInformationRoutes(app);

  app.get("/auth/providers", async () => authService.getProviders());

  app.post("/auth/email/start", async (request) => {
    const body = readBody<{ email?: unknown }>(request);
    return authService.startEmailLogin(readRequiredString(body.email), requestMeta(request, config));
  });

  app.post("/auth/email/verify", async (request) => {
    const body = readBody<{ email?: unknown; code?: unknown }>(request);
    return authService.verifyEmailCode(readRequiredString(body.email), readRequiredString(body.code), requestMeta(request, config));
  });

  app.get<{ Params: { provider: OAuthProvider }; Querystring: { return_to?: string } }>("/auth/oauth/:provider/start", async (request, reply) => {
    const provider = readOAuthProvider(request.params.provider);
    const authorizationUrl = await authService.startOAuth(provider, request.query.return_to ?? "app", requestMeta(request, config));
    if (request.headers.accept?.includes("application/json")) {
      return { authorizationUrl };
    }
    return reply.redirect(authorizationUrl);
  });

  app.get<{ Params: { provider: OAuthProvider }; Querystring: { code?: string; state?: string; error?: string } }>("/auth/oauth/:provider/callback", async (request, reply) => {
    const provider = readOAuthProvider(request.params.provider);
    const redirectUrl = await authService.handleOAuthCallback(provider, request.query);
    return reply.redirect(redirectUrl);
  });

  app.post("/auth/ticket/exchange", async (request) => {
    const body = readBody<{ ticket?: unknown }>(request);
    return authService.exchangeLoginTicket(readRequiredString(body.ticket), requestMeta(request, config));
  });

  app.post("/auth/refresh", async (request) => {
    const body = readBody<{ refreshToken?: unknown }>(request);
    return authService.refresh(readRequiredString(body.refreshToken), requestMeta(request, config));
  });

  app.post("/auth/logout", async (request) => {
    const body = readBody<{ refreshToken?: unknown }>(request);
    return authService.logout(readRequiredString(body.refreshToken));
  });

  app.delete("/auth/account", async (request, reply) => {
    const token = readOptionalBearerToken(request.headers.authorization);
    const body = readBody<{ confirmation?: unknown; operationId?: unknown; recoverySecret?: unknown }>(request);
    await authService.deleteAccount(token, body.confirmation, body.operationId, body.recoverySecret);
    return reply.status(204).send();
  });

  app.get("/me", async (request) => {
    const token = readBearerToken(request.headers.authorization);
    return authService.getMe(token);
  });

  registerTrainerDataRoutes({ app, authService, dataRepository: trainerDataRepository });
  if (config.admin.enabled) {
    registerAdminRoutes({ app, config, service: adminService, repository: resolvedAdminRepository });
  }

  return app;
}

function logSanitizedError(
  app: FastifyInstance,
  request: FastifyRequest,
  code: string,
  statusCode: number
) {
  const context = {
    code,
    statusCode,
    method: request.method,
    route: request.routeOptions.url ?? request.url.split("?", 1)[0]
  };
  if (statusCode >= 500) {
    app.log.error(context, "request failed");
  } else {
    app.log.warn(context, "request rejected");
  }
}

function requestMeta(request: FastifyRequest, config: AuthServerConfig) {
  return {
    ip: hashSecret(`auth-rate:${readClientIp(request)}`, config.tokens.refreshPepper),
    userAgent: request.headers["user-agent"] ?? null,
    deviceId: typeof request.headers["x-device-id"] === "string" ? request.headers["x-device-id"] : null
  };
}

export function normalizeClientIp(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;
  const version = isIP(candidate);
  if (version === 4) {
    return candidate.split(".").map((part) => String(Number(part))).join(".");
  }
  if (version !== 6) return null;

  const normalized = new URL(`http://[${candidate}]/`).hostname.slice(1, -1).toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!mappedIpv4) return normalized;
  const value32 = (Number.parseInt(mappedIpv4[1], 16) * 0x1_0000 + Number.parseInt(mappedIpv4[2], 16)) >>> 0;
  return [value32 >>> 24, (value32 >>> 16) & 0xff, (value32 >>> 8) & 0xff, value32 & 0xff].join(".");
}

function readClientIp(request: FastifyRequest) {
  let proxyResolvedIp: string | undefined;
  try {
    proxyResolvedIp = request.ip;
  } catch {
    proxyResolvedIp = undefined;
  }
  return normalizeClientIp(proxyResolvedIp) ?? normalizeClientIp(request.socket.remoteAddress) ?? "unknown";
}

function readBody<T>(request: FastifyRequest): T {
  return (request.body ?? {}) as T;
}

function readRequiredString(value: unknown) {
  if (typeof value !== "string" || value.length === 0) throw new AuthApiError("unknown", 400);
  return value;
}

function readOAuthProvider(value: string): OAuthProvider {
  if (value === "yandex" || value === "vk") return value;
  throw new AuthApiError("provider_disabled", 404);
}

function readBearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new AuthApiError("session_expired", 401);
  return match[1];
}

function readOptionalBearerToken(header: string | undefined) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
