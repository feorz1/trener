import { InMemoryAdminRepository } from "../admin/InMemoryAdminRepository";
import { InMemoryTrainerDataRepository } from "../data/InMemoryTrainerDataRepository";
import { AuthApiError } from "../errors";
import { InMemoryAuthRepository } from "../repositories/InMemoryAuthRepository";
import { safeCompareHash } from "../security";
import type { AccountDeletionReceipt, AccountDeletionRepository } from "./types";

export type InMemoryAccountDeletionOptions = {
  beforeCommit?: () => void | Promise<void>;
};

type ActivityEvent = {
  userId?: string | null;
};

type SharedDeletionState = {
  receipts: Map<string, AccountDeletionReceipt>;
  operationLocks: Map<string, Promise<void>>;
};

const sharedDeletionStates = new WeakMap<InMemoryAuthRepository, SharedDeletionState>();

export class InMemoryAccountDeletionRepository implements AccountDeletionRepository {
  readonly receipts: Map<string, AccountDeletionReceipt>;
  private readonly operationLocks: Map<string, Promise<void>>;

  constructor(
    private readonly authRepository: InMemoryAuthRepository,
    private readonly dataRepository: InMemoryTrainerDataRepository,
    private readonly adminRepository?: InMemoryAdminRepository,
    private readonly options: InMemoryAccountDeletionOptions = {}
  ) {
    const sharedState = getSharedDeletionState(authRepository);
    this.receipts = sharedState.receipts;
    this.operationLocks = sharedState.operationLocks;
  }

  async findDeletionReceipt(operationId: string) {
    const receipt = this.receipts.get(operationId);
    return receipt ? structuredClone(receipt) : null;
  }

  deleteAccount(userId: string, operationId: string, recoverySecretHash: string, expiresAt: Date) {
    return this.withOperationLock(operationId, async () => {
      const existingReceipt = this.receipts.get(operationId);
      if (existingReceipt) {
        assertValidRecoveryProof(existingReceipt, recoverySecretHash);
        return { email: null, alreadyCompleted: true };
      }

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
      const workoutSeries = cloneMap(this.dataRepository.workoutSeries);
      const workoutSeriesCommands = cloneMap(this.dataRepository.workoutSeriesCommands);
      const workoutSessions = cloneMap(this.dataRepository.workoutSessions);
      const activityEvents = structuredClone(this.dataRepository.activityEvents) as ActivityEvent[];
      const adminTrainers = this.adminRepository ? cloneMap(this.adminRepository.trainers) : null;
      const adminAuditLogs = this.adminRepository ? structuredClone(this.adminRepository.auditLogs) : null;
      const receipts = cloneMap(this.receipts);

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
      deleteMapValues(workoutSeries, (record) => record.trainerId === userId);
      for (const key of workoutSeriesCommands.keys()) {
        if (key.startsWith(`${userId}:`)) workoutSeriesCommands.delete(key);
      }
      deleteMapValues(workoutSessions, (record) => record.trainerId === userId);
      const retainedActivityEvents = activityEvents.filter((record) => record.userId !== userId);

      adminTrainers?.delete(userId);
      const retainedAdminAuditLogs = adminAuditLogs?.filter(
        (record) => !(record.targetType === "trainer" && record.targetId === userId)
      );

      const completedAt = new Date();
      receipts.set(operationId, {
        operationId,
        recoverySecretHash,
        createdAt: completedAt,
        completedAt,
        expiresAt
      });

      const pendingCommit = this.options.beforeCommit?.();
      if (pendingCommit) await pendingCommit;

      replaceMap(this.authRepository.users, users);
      replaceMap(this.authRepository.identities, identities);
      replaceMap(this.authRepository.emailCodes, emailCodes);
      replaceMap(this.authRepository.refreshTokens, refreshTokens);
      replaceMap(this.authRepository.loginTickets, loginTickets);
      replaceMap(this.dataRepository.clients, clients);
      replaceMap(this.dataRepository.exercises, exercises);
      replaceMap(this.dataRepository.workoutTemplates, workoutTemplates);
      replaceMap(this.dataRepository.workoutSeries, workoutSeries);
      replaceMap(this.dataRepository.workoutSeriesCommands, workoutSeriesCommands);
      replaceMap(this.dataRepository.workoutSessions, workoutSessions);
      replaceArray(this.dataRepository.activityEvents, retainedActivityEvents);
      replaceMap(this.receipts, receipts);
      if (this.adminRepository && adminTrainers && retainedAdminAuditLogs) {
        replaceMap(this.adminRepository.trainers, adminTrainers);
        replaceArray(this.adminRepository.auditLogs, retainedAdminAuditLogs);
      }

      return { email: user.email, alreadyCompleted: false };
    });
  }

  private async withOperationLock<T>(operationId: string, task: () => Promise<T>) {
    const previous = this.operationLocks.get(operationId);
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.operationLocks.set(operationId, current);
    if (previous) await previous;

    try {
      return await task();
    } finally {
      release();
      if (this.operationLocks.get(operationId) === current) this.operationLocks.delete(operationId);
    }
  }
}

function getSharedDeletionState(repository: InMemoryAuthRepository) {
  const existing = sharedDeletionStates.get(repository);
  if (existing) return existing;
  const created: SharedDeletionState = { receipts: new Map(), operationLocks: new Map() };
  sharedDeletionStates.set(repository, created);
  return created;
}

function assertValidRecoveryProof(receipt: AccountDeletionReceipt, recoverySecretHash: string) {
  if (!safeCompareHash(receipt.recoverySecretHash, recoverySecretHash)) {
    throw new AuthApiError("session_expired", 401);
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
  const seriesIds = new Set(
    [...repository.workoutSeries.values()].filter((record) => record.trainerId === userId).map((record) => record.id)
  );

  const templateConflict = [...repository.workoutTemplates.values()].some(
    (record) =>
      record.trainerId !== userId &&
      ((record.clientId !== null && clientIds.has(record.clientId)) ||
        record.items.some((item) => item.exerciseId !== null && exerciseIds.has(item.exerciseId)))
  );
  if (templateConflict) return true;

  const seriesConflict = [...repository.workoutSeries.values()].some(
    (record) =>
      record.trainerId !== userId &&
      (clientIds.has(record.clientId) ||
        record.slots.some((slot) => slot.items.some((item) => item.exerciseId !== null && exerciseIds.has(item.exerciseId))))
  );
  if (seriesConflict) return true;

  return [...repository.workoutSessions.values()].some(
    (record) =>
      record.trainerId !== userId &&
      ((record.clientId !== null && clientIds.has(record.clientId)) ||
        (record.workoutTemplateId !== null && templateIds.has(record.workoutTemplateId)) ||
        (record.seriesId !== null && seriesIds.has(record.seriesId)) ||
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
