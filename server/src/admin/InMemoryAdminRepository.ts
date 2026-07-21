import { randomUUID } from "node:crypto";
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

type MemoryTrainer = {
  id: string;
  email: string | null;
  displayName: string | null;
  providers: Array<"email" | "yandex" | "vk">;
  createdAt: Date;
  lastSeenAt: Date | null;
  blockedAt: Date | null;
  blockedReason: string | null;
  clients: TrainerClientItem[];
  workouts: TrainerWorkoutItem[];
  refreshSessions: Array<{ id: string; revokedAt: Date | null }>;
};

export class InMemoryAdminRepository implements AdminRepository {
  readonly admins = new Map<string, AdminUserRecord>();
  readonly sessions = new Map<string, AdminSessionRecord>();
  readonly auditLogs: AuditLogItem[] = [];
  readonly trainers = new Map<string, MemoryTrainer>();

  async ready() {}

  async findAdminByEmail(email: string) {
    return [...this.admins.values()].find((admin) => admin.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async findAdminById(id: string) {
    return this.admins.get(id) ?? null;
  }

  async createAdminUser(input: { email: string; passwordHash: string; role: AdminRole }) {
    const now = new Date();
    const admin: AdminUserRecord = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.admins.set(admin.id, admin);
    return admin;
  }

  async updateAdminLastLogin(id: string, at: Date) {
    const admin = this.admins.get(id);
    if (admin) this.admins.set(id, { ...admin, lastLoginAt: at, updatedAt: at });
  }

  async createAdminSession(input: {
    adminUserId: string;
    tokenHash: string;
    csrfTokenHash: string;
    userAgent?: string | null;
    ipHash?: string | null;
    expiresAt: Date;
  }) {
    const session: AdminSessionRecord = {
      id: randomUUID(),
      adminUserId: input.adminUserId,
      tokenHash: input.tokenHash,
      csrfTokenHash: input.csrfTokenHash,
      userAgent: input.userAgent ?? null,
      ipHash: input.ipHash ?? null,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: new Date()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findAdminSessionByTokenHash(tokenHash: string) {
    const session = [...this.sessions.values()].find((item) => item.tokenHash === tokenHash);
    if (!session) return null;
    return { ...session, adminUser: this.admins.get(session.adminUserId) };
  }

  async revokeAdminSession(id: string) {
    const session = this.sessions.get(id);
    if (session) this.sessions.set(id, { ...session, revokedAt: session.revokedAt ?? new Date() });
  }

  async logAudit(input: AuditInput) {
    if (input.targetType === "trainer" && (!input.targetId || !this.trainers.has(input.targetId))) return;
    const admin = input.adminUserId ? this.admins.get(input.adminUserId) : null;
    this.auditLogs.unshift({
      id: randomUUID(),
      adminEmail: admin?.email ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: new Date().toISOString()
    });
  }

  async getOverviewStats(now: Date): Promise<OverviewStats> {
    const sevenDaysAgo = daysAgo(now, 7);
    const thirtyDaysAgo = daysAgo(now, 30);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const trainers = [...this.trainers.values()];
    return {
      trainersTotal: trainers.length,
      trainersNewToday: trainers.filter((trainer) => trainer.createdAt >= today).length,
      trainersNew7d: trainers.filter((trainer) => trainer.createdAt >= sevenDaysAgo).length,
      trainersActive7d: trainers.filter((trainer) => trainer.lastSeenAt && trainer.lastSeenAt >= sevenDaysAgo).length,
      trainersActive30d: trainers.filter((trainer) => trainer.lastSeenAt && trainer.lastSeenAt >= thirtyDaysAgo).length,
      clientsTotal: trainers.reduce((sum, trainer) => sum + trainer.clients.length, 0),
      clientsCreated7d: trainers.reduce((sum, trainer) => sum + trainer.clients.filter((client) => new Date(client.createdAt) >= sevenDaysAgo).length, 0),
      workoutTemplatesTotal: 0,
      workoutSessionsTotal: trainers.reduce((sum, trainer) => sum + trainer.workouts.length, 0),
      workoutSessionsCompleted7d: trainers.reduce((sum, trainer) => sum + trainer.workouts.filter((workout) => workout.status === "completed" && new Date(workout.createdAt) >= sevenDaysAgo).length, 0),
      emailLogins7d: 0,
      oauthLogins7d: 0,
      authErrors24h: 0
    };
  }

  async getTimeseries(metric: TimeseriesMetric, days: number, now: Date) {
    const points = new Map<string, number>();
    for (let index = days - 1; index >= 0; index -= 1) points.set(formatDate(daysAgo(now, index)), 0);
    const dates =
      metric === "trainers_new"
        ? [...this.trainers.values()].map((trainer) => trainer.createdAt)
        : metric === "active_trainers"
          ? [...this.trainers.values()].flatMap((trainer) => (trainer.lastSeenAt ? [trainer.lastSeenAt] : []))
          : [...this.trainers.values()].flatMap((trainer) => trainer.workouts.filter((workout) => workout.status === "completed").map((workout) => new Date(workout.createdAt)));
    for (const date of dates) {
      const key = formatDate(date);
      if (points.has(key)) points.set(key, (points.get(key) ?? 0) + 1);
    }
    return [...points.entries()].map(([date, value]) => ({ date, value }));
  }

  async listTrainers(query: TrainerListQuery) {
    let data = [...this.trainers.values()].map(mapTrainer);
    if (query.search) {
      const search = query.search.toLowerCase();
      data = data.filter((trainer) => trainer.email?.toLowerCase().includes(search) || trainer.displayName?.toLowerCase().includes(search));
    }
    if (query.provider) data = data.filter((trainer) => trainer.providers.includes(query.provider!));
    if (query.status) data = data.filter((trainer) => (query.status === "blocked") === trainer.isBlocked);
    const total = data.length;
    data = data.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async getTrainerDetail(id: string): Promise<TrainerDetail | null> {
    const trainer = this.trainers.get(id);
    if (!trainer) return null;
    return {
      ...mapTrainer(trainer),
      blockedAt: trainer.blockedAt?.toISOString() ?? null,
      blockedReason: trainer.blockedReason,
      recentActivityEvents: [],
      recentAuthEvents: []
    };
  }

  async listTrainerClients(id: string): Promise<TrainerClientItem[]> {
    return this.trainers.get(id)?.clients ?? [];
  }

  async listTrainerWorkouts(id: string): Promise<TrainerWorkoutItem[]> {
    return this.trainers.get(id)?.workouts ?? [];
  }

  async setTrainerBlocked(id: string, blocked: boolean, reason?: string | null) {
    const trainer = this.trainers.get(id);
    if (!trainer) return null;
    trainer.blockedAt = blocked ? new Date() : null;
    trainer.blockedReason = blocked ? reason ?? "admin_action" : null;
    return mapTrainer(trainer);
  }

  async revokeTrainerSessions(id: string) {
    const trainer = this.trainers.get(id);
    if (!trainer) return 0;
    let count = 0;
    for (const session of trainer.refreshSessions) {
      if (!session.revokedAt) {
        session.revokedAt = new Date();
        count += 1;
      }
    }
    return count;
  }

  async listAuditLog(page: number, pageSize: number) {
    return {
      data: this.auditLogs.slice((page - 1) * pageSize, page * pageSize),
      total: this.auditLogs.length,
      page,
      pageSize
    };
  }

  async listAuthEvents(): Promise<AuthEvents> {
    return { recentLogins: [], loginErrors: [], oauthErrors: [], emailRateLimitEvents: [] };
  }

  async listSuspiciousSessions(): Promise<SuspiciousSession[]> {
    return [...this.trainers.values()].flatMap((trainer) =>
      trainer.refreshSessions
        .filter((session) => session.revokedAt)
        .map((session) => ({
          id: session.id,
          userId: trainer.id,
          userAgent: null,
          ipHash: null,
          revokedAt: session.revokedAt?.toISOString() ?? null,
          createdAt: new Date().toISOString()
        }))
    );
  }

  seedTrainer(input: Partial<MemoryTrainer> = {}) {
    const now = new Date();
    const trainer: MemoryTrainer = {
      id: input.id ?? randomUUID(),
      email: input.email ?? "trainer@example.com",
      displayName: input.displayName ?? "Тренер",
      providers: input.providers ?? ["email"],
      createdAt: input.createdAt ?? now,
      lastSeenAt: input.lastSeenAt ?? now,
      blockedAt: input.blockedAt ?? null,
      blockedReason: input.blockedReason ?? null,
      clients: input.clients ?? [],
      workouts: input.workouts ?? [],
      refreshSessions: input.refreshSessions ?? [{ id: randomUUID(), revokedAt: null }]
    };
    this.trainers.set(trainer.id, trainer);
    return trainer;
  }
}

function mapTrainer(trainer: MemoryTrainer): TrainerListItem {
  return {
    id: trainer.id,
    email: trainer.email,
    displayName: trainer.displayName,
    providers: trainer.providers,
    createdAt: trainer.createdAt.toISOString(),
    lastSeenAt: trainer.lastSeenAt?.toISOString() ?? null,
    clientsCount: trainer.clients.length,
    workoutTemplatesCount: 0,
    workoutSessionsCount: trainer.workouts.length,
    completedWorkoutsCount: trainer.workouts.filter((workout) => workout.status === "completed").length,
    isBlocked: Boolean(trainer.blockedAt)
  };
}

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
