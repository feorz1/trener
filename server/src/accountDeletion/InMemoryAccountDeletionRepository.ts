import { AuthApiError } from "../errors";
import { InMemoryAdminRepository } from "../admin/InMemoryAdminRepository";
import { InMemoryTrainerDataRepository } from "../data/InMemoryTrainerDataRepository";
import { InMemoryAuthRepository } from "../repositories/InMemoryAuthRepository";
import type { AccountDeletionRepository } from "./types";

export type InMemoryAccountDeletionOptions = {
  beforeCommit?: () => void;
};

type ActivityEvent = {
  userId?: string | null;
};

export class InMemoryAccountDeletionRepository implements AccountDeletionRepository {
  constructor(
    private readonly authRepository: InMemoryAuthRepository,
    private readonly dataRepository: InMemoryTrainerDataRepository,
    private readonly adminRepository?: InMemoryAdminRepository,
    private readonly options: InMemoryAccountDeletionOptions = {}
  ) {}

  async deleteAccount(userId: string) {
    const user = this.authRepository.users.get(userId);
    if (!user || user.deletedAt) throw new AuthApiError("session_expired", 401);

    const normalizedEmail = user.email?.toLowerCase() ?? null;
    if (
      normalizedEmail &&
      [...this.authRepository.users.values()].some(
        (candidate) => candidate.id !== userId && !candidate.deletedAt && candidate.email?.toLowerCase() === normalizedEmail
      )
    ) {
      throw deletionConflict();
    }
    if (hasCrossOwnerReferences(this.dataRepository, userId)) throw deletionConflict();

    const users = cloneMap(this.authRepository.users);
    const identities = cloneMap(this.authRepository.identities);
    const emailCodes = cloneMap(this.authRepository.emailCodes);
    const refreshTokens = cloneMap(this.authRepository.refreshTokens);
    const loginTickets = cloneMap(this.authRepository.loginTickets);
    const clients = cloneMap(this.dataRepository.clients);
    const exercises = cloneMap(this.dataRepository.exercises);
    const workoutTemplates = cloneMap(this.dataRepository.workoutTemplates);
    const workoutSessions = cloneMap(this.dataRepository.workoutSessions);
    const activityEvents = structuredClone(this.dataRepository.activityEvents) as ActivityEvent[];
    const adminTrainers = this.adminRepository ? cloneMap(this.adminRepository.trainers) : null;
    const adminAuditLogs = this.adminRepository ? structuredClone(this.adminRepository.auditLogs) : null;

    users.delete(userId);
    deleteMapValues(identities, (record) => record.userId === userId);
    deleteMapValues(refreshTokens, (record) => record.userId === userId);
    deleteMapValues(loginTickets, (record) => record.userId === userId);
    if (normalizedEmail) {
      deleteMapValues(emailCodes, (record) => record.email.toLowerCase() === normalizedEmail);
    }

    deleteMapValues(clients, (record) => record.trainerId === userId);
    deleteMapValues(exercises, (record) => record.trainerId === userId);
    deleteMapValues(workoutTemplates, (record) => record.trainerId === userId);
    deleteMapValues(workoutSessions, (record) => record.trainerId === userId);
    const retainedActivityEvents = activityEvents.filter((record) => record.userId !== userId);

    adminTrainers?.delete(userId);
    const retainedAdminAuditLogs = adminAuditLogs?.filter(
      (record) => !(record.targetType === "trainer" && record.targetId === userId)
    );

    this.options.beforeCommit?.();

    replaceMap(this.authRepository.users, users);
    replaceMap(this.authRepository.identities, identities);
    replaceMap(this.authRepository.emailCodes, emailCodes);
    replaceMap(this.authRepository.refreshTokens, refreshTokens);
    replaceMap(this.authRepository.loginTickets, loginTickets);
    replaceMap(this.dataRepository.clients, clients);
    replaceMap(this.dataRepository.exercises, exercises);
    replaceMap(this.dataRepository.workoutTemplates, workoutTemplates);
    replaceMap(this.dataRepository.workoutSessions, workoutSessions);
    replaceArray(this.dataRepository.activityEvents, retainedActivityEvents);
    if (this.adminRepository && adminTrainers && retainedAdminAuditLogs) {
      replaceMap(this.adminRepository.trainers, adminTrainers);
      replaceArray(this.adminRepository.auditLogs, retainedAdminAuditLogs);
    }

    return { email: user.email };
  }
}

function hasCrossOwnerReferences(repository: InMemoryTrainerDataRepository, userId: string) {
  const clientIds = new Set(
    [...repository.clients.values()].filter((record) => record.trainerId === userId).map((record) => record.id)
  );
  const exerciseIds = new Set(
    [...repository.exercises.values()].filter((record) => record.trainerId === userId).map((record) => record.id)
  );
  const templateIds = new Set(
    [...repository.workoutTemplates.values()].filter((record) => record.trainerId === userId).map((record) => record.id)
  );

  const templateConflict = [...repository.workoutTemplates.values()].some(
    (record) =>
      record.trainerId !== userId &&
      ((record.clientId !== null && clientIds.has(record.clientId)) ||
        record.items.some((item) => item.exerciseId !== null && exerciseIds.has(item.exerciseId)))
  );
  if (templateConflict) return true;

  return [...repository.workoutSessions.values()].some(
    (record) =>
      record.trainerId !== userId &&
      ((record.clientId !== null && clientIds.has(record.clientId)) ||
        (record.workoutTemplateId !== null && templateIds.has(record.workoutTemplateId)) ||
        record.items.some((item) => item.exerciseId !== null && exerciseIds.has(item.exerciseId)))
  );
}

function deletionConflict() {
  return new AuthApiError("account_conflict", 409, "Удаление аккаунта временно недоступно");
}

function cloneMap<K, V>(source: Map<K, V>) {
  return structuredClone(source) as Map<K, V>;
}

function deleteMapValues<K, V>(map: Map<K, V>, predicate: (value: V) => boolean) {
  for (const [key, value] of map) {
    if (predicate(value)) map.delete(key);
  }
}

function replaceMap<K, V>(target: Map<K, V>, source: Map<K, V>) {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
}

function replaceArray<T>(target: T[], source: T[]) {
  target.splice(0, target.length, ...source);
}
