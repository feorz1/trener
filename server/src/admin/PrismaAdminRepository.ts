import { Prisma, PrismaClient } from "@prisma/client";
import type {
  AdminRepository,
  AdminRole,
  AdminSessionRecord,
  AdminUserRecord,
  AuditInput,
  AuditLogItem,
  AuthEvents,
  OverviewStats,
  SuspiciousSession,
  TimeseriesMetric,
  TrainerClientItem,
  TrainerDetail,
  TrainerListItem,
  TrainerListQuery,
  TrainerWorkoutItem
} from "./types";

const prisma = new PrismaClient();

export class PrismaAdminRepository implements AdminRepository {
  async ready() {
    await prisma.$queryRaw`SELECT 1`;
  }

  async findAdminByEmail(email: string) {
    const admin = await prisma.adminUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } }
    });
    return admin ? mapAdmin(admin) : null;
  }

  async findAdminById(id: string) {
    const admin = await prisma.adminUser.findUnique({ where: { id } });
    return admin ? mapAdmin(admin) : null;
  }

  async createAdminUser(input: { email: string; passwordHash: string; role: AdminRole }) {
    return mapAdmin(
      await prisma.adminUser.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role
        }
      })
    );
  }

  async updateAdminLastLogin(id: string, at: Date) {
    await prisma.adminUser.update({ where: { id }, data: { lastLoginAt: at } });
  }

  async createAdminSession(input: {
    adminUserId: string;
    tokenHash: string;
    csrfTokenHash: string;
    userAgent?: string | null;
    ipHash?: string | null;
    expiresAt: Date;
  }) {
    return mapSession(
      await prisma.adminSession.create({
        data: {
          adminUserId: input.adminUserId,
          tokenHash: input.tokenHash,
          csrfTokenHash: input.csrfTokenHash,
          userAgent: input.userAgent ?? null,
          ipHash: input.ipHash ?? null,
          expiresAt: input.expiresAt
        }
      })
    );
  }

  async findAdminSessionByTokenHash(tokenHash: string) {
    const session = await prisma.adminSession.findFirst({
      where: { tokenHash },
      include: { adminUser: true }
    });
    return session ? mapSession(session) : null;
  }

  async revokeAdminSession(id: string) {
    await prisma.adminSession.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async logAudit(input: AuditInput) {
    const data = auditData(input);
    if (input.targetType !== "trainer" || !input.targetId) {
      await prisma.adminAuditLog.create({ data });
      return;
    }

    if (!isUuid(input.targetId)) return;
    await prisma.$transaction(async (tx) => {
      // A real MVCC update interlocks with deletion and forces a Serializable
      // deletion transaction that already took its snapshot to retry. A mere
      // KEY SHARE lock would not make the later audit row visible to that
      // frozen snapshot.
      const trainers = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE users
        SET updated_at = updated_at
        WHERE id = ${input.targetId}::uuid AND deleted_at IS NULL
        RETURNING id::text AS id
      `;
      if (trainers.length === 0) return;
      await tx.adminAuditLog.create({ data });
    });
  }

  async getOverviewStats(now: Date): Promise<OverviewStats> {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = daysAgo(now, 7);
    const thirtyDaysAgo = daysAgo(now, 30);
    const dayAgo = daysAgo(now, 1);
    const activeUserWhere = { deletedAt: null };
    const [
      trainersTotal,
      trainersNewToday,
      trainersNew7d,
      trainersActive7d,
      trainersActive30d,
      clientsTotal,
      clientsCreated7d,
      workoutTemplatesTotal,
      workoutSessionsTotal,
      workoutSessionsCompleted7d,
      emailLogins7d,
      oauthLogins7d,
      authErrors24h
    ] = await Promise.all([
      prisma.user.count({ where: activeUserWhere }),
      prisma.user.count({ where: { ...activeUserWhere, createdAt: { gte: startOfToday } } }),
      prisma.user.count({ where: { ...activeUserWhere, createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { ...activeUserWhere, lastSeenAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { ...activeUserWhere, lastSeenAt: { gte: thirtyDaysAgo } } }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.client.count({ where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } } }),
      prisma.workoutTemplate.count({ where: { deletedAt: null } }),
      prisma.workoutSession.count({ where: { deletedAt: null } }),
      prisma.workoutSession.count({
        where: {
          deletedAt: null,
          status: "COMPLETED",
          OR: [{ finishedAt: { gte: sevenDaysAgo } }, { finishedAt: null, updatedAt: { gte: sevenDaysAgo } }]
        }
      }),
      prisma.emailLoginCode.count({ where: { consumedAt: { gte: sevenDaysAgo } } }),
      prisma.loginTicket.count({ where: { consumedAt: { gte: sevenDaysAgo } } }),
      prisma.emailLoginCode.count({ where: { attemptCount: { gt: 0 }, createdAt: { gte: dayAgo } } })
    ]);
    return {
      trainersTotal,
      trainersNewToday,
      trainersNew7d,
      trainersActive7d,
      trainersActive30d,
      clientsTotal,
      clientsCreated7d,
      workoutTemplatesTotal,
      workoutSessionsTotal,
      workoutSessionsCompleted7d,
      emailLogins7d,
      oauthLogins7d,
      authErrors24h
    };
  }

  async getTimeseries(metric: TimeseriesMetric, days: number, now: Date) {
    const start = startOfDay(daysAgo(now, days - 1));
    if (metric === "trainers_new") {
      const users = await prisma.user.findMany({ where: { deletedAt: null, createdAt: { gte: start } }, select: { createdAt: true } });
      return bucketDates(users.map((item) => item.createdAt), days, now);
    }
    if (metric === "active_trainers") {
      const users = await prisma.user.findMany({ where: { deletedAt: null, lastSeenAt: { gte: start } }, select: { lastSeenAt: true } });
      return bucketDates(users.flatMap((item) => (item.lastSeenAt ? [item.lastSeenAt] : [])), days, now);
    }
    const sessions = await prisma.workoutSession.findMany({
      where: { deletedAt: null, status: "COMPLETED", OR: [{ finishedAt: { gte: start } }, { finishedAt: null, updatedAt: { gte: start } }] },
      select: { finishedAt: true, updatedAt: true }
    });
    return bucketDates(sessions.map((item) => item.finishedAt ?? item.updatedAt), days, now);
  }

  async listTrainers(query: TrainerListQuery) {
    const where = trainerWhere(query);
    const orderBy = trainerOrder(query);
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          identities: true,
          _count: {
            select: {
              clients: { where: { deletedAt: null } },
              workoutTemplates: { where: { deletedAt: null } },
              workoutSessions: { where: { deletedAt: null } }
            }
          }
        }
      })
    ]);
    const data = await Promise.all(users.map((user) => mapTrainerListItem(user)));
    return { data: sortTrainerItems(data, query), total, page: query.page, pageSize: query.pageSize };
  }

  async getTrainerDetail(id: string): Promise<TrainerDetail | null> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        identities: true,
        _count: {
          select: {
            clients: { where: { deletedAt: null } },
            workoutTemplates: { where: { deletedAt: null } },
            workoutSessions: { where: { deletedAt: null } }
          }
        }
      }
    });
    if (!user) return null;
    const [base, recentActivityEvents, recentAuthEvents] = await Promise.all([
      mapTrainerListItem(user),
      prisma.activityEvent.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.activityEvent.findMany({
        where: { userId: id, type: { startsWith: "auth." } },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);
    return {
      ...base,
      blockedAt: user.blockedAt?.toISOString() ?? null,
      blockedReason: user.blockedReason,
      recentActivityEvents: recentActivityEvents.map((event) => ({
        id: event.id,
        type: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        createdAt: event.createdAt.toISOString()
      })),
      recentAuthEvents: recentAuthEvents.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt.toISOString()
      }))
    };
  }

  async listTrainerClients(id: string): Promise<TrainerClientItem[]> {
    const clients = await prisma.client.findMany({
      where: { trainerId: id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        workoutSessions: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 1 },
        _count: { select: { workoutSessions: { where: { deletedAt: null } } } }
      }
    });
    return clients.map((client) => ({
      id: client.id,
      name: client.name,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
      workoutsCount: client._count.workoutSessions,
      lastWorkoutAt: client.workoutSessions[0]?.updatedAt.toISOString() ?? null,
      status: client.status.toLowerCase()
    }));
  }

  async listTrainerWorkouts(id: string): Promise<TrainerWorkoutItem[]> {
    const sessions = await prisma.workoutSession.findMany({
      where: { trainerId: id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { client: true }
    });
    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      clientName: session.client?.name ?? null,
      status: session.status.toLowerCase(),
      scheduledAt: session.scheduledAt?.toISOString() ?? null,
      startedAt: session.startedAt?.toISOString() ?? null,
      finishedAt: session.finishedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString()
    }));
  }

  async setTrainerBlocked(id: string, blocked: boolean, reason?: string | null) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        blockedAt: blocked ? new Date() : null,
        blockedReason: blocked ? reason ?? "admin_action" : null
      },
      include: {
        identities: true,
        _count: { select: { clients: true, workoutTemplates: true, workoutSessions: true } }
      }
    });
    return mapTrainerListItem(user);
  }

  async revokeTrainerSessions(id: string) {
    const result = await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return result.count;
  }

  async listAuditLog(page: number, pageSize: number) {
    const [total, logs] = await Promise.all([
      prisma.adminAuditLog.count(),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { adminUser: true }
      })
    ]);
    return { data: logs.map(mapAuditLog), total, page, pageSize };
  }

  async listAuthEvents(): Promise<AuthEvents> {
    const [recentLogins, loginErrors, oauthErrors, emailRateLimitEvents] = await Promise.all([
      prisma.emailLoginCode.findMany({ where: { consumedAt: { not: null } }, orderBy: { consumedAt: "desc" }, take: 50 }),
      prisma.emailLoginCode.findMany({ where: { attemptCount: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.oAuthState.findMany({ where: { consumedAt: null, expiresAt: { lt: new Date() } }, orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.emailLoginCode.findMany({ where: { attemptCount: { gte: 5 } }, orderBy: { createdAt: "desc" }, take: 50 })
    ]);
    return {
      recentLogins: recentLogins.map((item) => ({ id: item.id, email: item.email, createdAt: item.createdAt.toISOString(), consumedAt: item.consumedAt?.toISOString() ?? null })),
      loginErrors: loginErrors.map((item) => ({ id: item.id, email: item.email, attemptCount: item.attemptCount, createdAt: item.createdAt.toISOString() })),
      oauthErrors: oauthErrors.map((item) => ({ id: item.id, provider: item.provider, createdAt: item.createdAt.toISOString(), consumedAt: item.consumedAt?.toISOString() ?? null })),
      emailRateLimitEvents: emailRateLimitEvents.map((item) => ({ id: item.id, email: item.email, attemptCount: item.attemptCount, createdAt: item.createdAt.toISOString() }))
    };
  }

  async listSuspiciousSessions(): Promise<SuspiciousSession[]> {
    const sessions = await prisma.refreshToken.findMany({
      where: { revokedAt: { not: null } },
      orderBy: { revokedAt: "desc" },
      take: 100
    });
    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      userAgent: session.userAgent,
      ipHash: session.ipHash,
      revokedAt: session.revokedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString()
    }));
  }
}

function auditData(input: AuditInput): Prisma.AdminAuditLogUncheckedCreateInput {
  return {
    adminUserId: input.adminUserId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata === undefined ? undefined : input.metadata === null ? Prisma.JsonNull : (input.metadata as Prisma.InputJsonValue),
    ipHash: input.ipHash ?? null,
    userAgent: input.userAgent ?? null
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapAdmin(admin: {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminUserRecord {
  return admin;
}

function mapSession(
  session: {
    id: string;
    adminUserId: string;
    tokenHash: string;
    csrfTokenHash: string;
    userAgent: string | null;
    ipHash: string | null;
    expiresAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
    adminUser?: AdminUserRecord;
  }
): AdminSessionRecord {
  return {
    ...session,
    adminUser: session.adminUser ? mapAdmin(session.adminUser) : undefined
  };
}

async function mapTrainerListItem(user: {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  blockedAt: Date | null;
  identities: Array<{ provider: string }>;
  _count: { clients: number; workoutTemplates: number; workoutSessions: number };
}): Promise<TrainerListItem> {
  const completedWorkoutsCount = await prisma.workoutSession.count({ where: { trainerId: user.id, deletedAt: null, status: "COMPLETED" } });
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    providers: user.identities.map((identity) => identity.provider).filter(isAuthProvider),
    createdAt: user.createdAt.toISOString(),
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    clientsCount: user._count.clients,
    workoutTemplatesCount: user._count.workoutTemplates,
    workoutSessionsCount: user._count.workoutSessions,
    completedWorkoutsCount,
    isBlocked: Boolean(user.blockedAt)
  };
}

function trainerWhere(query: TrainerListQuery): Prisma.UserWhereInput {
  return {
    deletedAt: null,
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: "insensitive" } },
            { displayName: { contains: query.search, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(query.provider ? { identities: { some: { provider: query.provider } } } : {}),
    ...(query.status === "active" ? { blockedAt: null } : query.status === "blocked" ? { blockedAt: { not: null } } : {}),
    ...(query.registeredFrom || query.registeredTo ? { createdAt: { ...(query.registeredFrom ? { gte: query.registeredFrom } : {}), ...(query.registeredTo ? { lte: query.registeredTo } : {}) } } : {})
  };
}

function trainerOrder(query: TrainerListQuery): Prisma.UserOrderByWithRelationInput {
  const order = query.order ?? "desc";
  if (query.sort === "lastSeenAt") return { lastSeenAt: order };
  return { createdAt: order };
}

function sortTrainerItems(items: TrainerListItem[], query: TrainerListQuery) {
  if (query.sort !== "clientsCount" && query.sort !== "workoutsCount") return items;
  const direction = query.order === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftValue = query.sort === "clientsCount" ? left.clientsCount : left.workoutSessionsCount;
    const rightValue = query.sort === "clientsCount" ? right.clientsCount : right.workoutSessionsCount;
    return (leftValue - rightValue) * direction;
  });
}

function mapAuditLog(log: {
  id: string;
  adminUser: { email: string } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: Date;
}): AuditLogItem {
  return {
    id: log.id,
    adminEmail: log.adminUser?.email ?? null,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    metadata: log.metadata,
    ipHash: log.ipHash,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString()
  };
}

function bucketDates(dates: Date[], days: number, now: Date) {
  const points = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    points.set(formatDate(daysAgo(now, index)), 0);
  }
  for (const date of dates) {
    const key = formatDate(date);
    if (points.has(key)) points.set(key, (points.get(key) ?? 0) + 1);
  }
  return [...points.entries()].map(([date, value]) => ({ date, value }));
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isAuthProvider(value: string): value is "email" | "yandex" | "vk" {
  return value === "email" || value === "yandex" || value === "vk";
}
