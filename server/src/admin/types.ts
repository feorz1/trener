import type { AuthProvider } from "../types";

export type AdminRole = "OWNER" | "ADMIN" | "SUPPORT" | "READ_ONLY";

export type RequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminSessionRecord = {
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
};

export type PublicAdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type AuditInput = {
  adminUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: unknown;
  ipHash?: string | null;
  userAgent?: string | null;
};

export type OverviewStats = {
  trainersTotal: number;
  trainersNewToday: number;
  trainersNew7d: number;
  trainersActive7d: number;
  trainersActive30d: number;
  clientsTotal: number;
  clientsCreated7d: number;
  workoutTemplatesTotal: number;
  workoutSessionsTotal: number;
  workoutSessionsCompleted7d: number;
  emailLogins7d: number;
  oauthLogins7d: number;
  authErrors24h: number;
};

export type TimeseriesMetric = "trainers_new" | "workouts_completed" | "active_trainers";
export type TimeseriesRange = "7d" | "30d" | "90d";

export type TrainerListQuery = {
  search?: string;
  provider?: AuthProvider;
  status?: "active" | "blocked";
  registeredFrom?: Date;
  registeredTo?: Date;
  sort?: "createdAt" | "lastSeenAt" | "clientsCount" | "workoutsCount";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type TrainerListItem = {
  id: string;
  email: string | null;
  displayName: string | null;
  providers: AuthProvider[];
  createdAt: string;
  lastSeenAt: string | null;
  clientsCount: number;
  workoutTemplatesCount: number;
  workoutSessionsCount: number;
  completedWorkoutsCount: number;
  isBlocked: boolean;
};

export type TrainerDetail = TrainerListItem & {
  blockedAt: string | null;
  blockedReason: string | null;
  recentActivityEvents: Array<{
    id: string;
    type: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }>;
  recentAuthEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
  }>;
};

export type TrainerClientItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  workoutsCount: number;
  lastWorkoutAt: string | null;
  status: string;
};

export type TrainerWorkoutItem = {
  id: string;
  title: string;
  clientName: string | null;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type AuditLogItem = {
  id: string;
  adminEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuthEvents = {
  recentLogins: Array<{ id: string; email: string; createdAt: string; consumedAt: string | null }>;
  loginErrors: Array<{ id: string; email: string; attemptCount: number; createdAt: string }>;
  oauthErrors: Array<{ id: string; provider: string; createdAt: string; consumedAt: string | null }>;
  emailRateLimitEvents: Array<{ id: string; email: string; attemptCount: number; createdAt: string }>;
};

export type SuspiciousSession = {
  id: string;
  userId: string;
  userAgent: string | null;
  ipHash: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export interface AdminRepository {
  ready(): Promise<void>;
  findAdminByEmail(email: string): Promise<AdminUserRecord | null>;
  findAdminById(id: string): Promise<AdminUserRecord | null>;
  createAdminUser(input: { email: string; passwordHash: string; role: AdminRole }): Promise<AdminUserRecord>;
  updateAdminLastLogin(id: string, at: Date): Promise<void>;
  createAdminSession(input: {
    adminUserId: string;
    tokenHash: string;
    csrfTokenHash: string;
    userAgent?: string | null;
    ipHash?: string | null;
    expiresAt: Date;
  }): Promise<AdminSessionRecord>;
  findAdminSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null>;
  revokeAdminSession(id: string): Promise<void>;
  logAudit(input: AuditInput): Promise<void>;
  getOverviewStats(now: Date): Promise<OverviewStats>;
  getTimeseries(metric: TimeseriesMetric, days: number, now: Date): Promise<Array<{ date: string; value: number }>>;
  listTrainers(query: TrainerListQuery): Promise<{ data: TrainerListItem[]; total: number; page: number; pageSize: number }>;
  getTrainerDetail(id: string): Promise<TrainerDetail | null>;
  listTrainerClients(id: string): Promise<TrainerClientItem[]>;
  listTrainerWorkouts(id: string): Promise<TrainerWorkoutItem[]>;
  setTrainerBlocked(id: string, blocked: boolean, reason?: string | null): Promise<TrainerListItem | null>;
  revokeTrainerSessions(id: string): Promise<number>;
  listAuditLog(page: number, pageSize: number): Promise<{ data: AuditLogItem[]; total: number; page: number; pageSize: number }>;
  listAuthEvents(): Promise<AuthEvents>;
  listSuspiciousSessions(): Promise<SuspiciousSession[]>;
}
