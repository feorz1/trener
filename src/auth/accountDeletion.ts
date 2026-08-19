import type { AuthRefreshResult } from "./types";
import type { PendingAccountDeletion } from "@/data/persistence/accountDeletionRecovery";
import type { AccountDeletionRecoveryProof } from "./services/accountDeletionSecretStorage";
import { AuthFlowError, normalizeAuthError } from "./utils/authErrors";

export type AccountDeletionCleanup = {
  ownerId: string;
  prepare: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
};

export type ExecuteAccountDeletionInput = {
  accessToken: string | null;
  ownerId: string | null;
  registeredCleanup: AccountDeletionCleanup | null;
  pauseAndDrain: () => Promise<void>;
  resume: () => void;
  loadDeletionRecovery: () => Promise<{ pending: PendingAccountDeletion; proof: AccountDeletionRecoveryProof } | null>;
  createDeletionRecovery: (ownerId: string) => Promise<AccountDeletionRecoveryProof>;
  persistDeletionRecovery: (proof: AccountDeletionRecoveryProof) => Promise<PendingAccountDeletion>;
  discardDeletionRecovery: () => Promise<void>;
  markDeletionState: (operationId: string, state: PendingAccountDeletion["state"]) => Promise<void>;
  deleteRemoteAccount: (accessToken: string, operationId: string, recoverySecret: string) => Promise<void>;
  clearAuthSession: (operationId: string) => Promise<void>;
  markDeletionComplete?: () => void;
};

export class AccountDeletionCleanupPendingError extends AuthFlowError {
  constructor(cause: unknown) {
    super(
      "server_error",
      "Удаление запущено. Повторите, чтобы подтвердить результат и завершить очистку данных.",
      { cause }
    );
    this.name = "AccountDeletionCleanupPendingError";
  }
}

export async function executeAccountDeletion(input: ExecuteAccountDeletionInput) {
  const {
    accessToken,
    ownerId,
    registeredCleanup,
    pauseAndDrain,
    resume,
    loadDeletionRecovery,
    createDeletionRecovery,
    persistDeletionRecovery,
    discardDeletionRecovery,
    markDeletionState,
    deleteRemoteAccount,
    clearAuthSession,
    markDeletionComplete
  } = input;
  if (!accessToken || !ownerId) {
    throw new AuthFlowError("session_expired");
  }
  if (!registeredCleanup || registeredCleanup.ownerId !== ownerId) {
    throw new AuthFlowError("server_error", "Локальные данные аккаунта ещё не готовы");
  }

  try {
    await pauseAndDrain();
    await registeredCleanup.prepare();
  } catch (error) {
    resume();
    await registeredCleanup.rollback().catch(() => undefined);
    const authError = normalizeAuthError(error, "server_error");
    throw new AuthFlowError(authError.code, authError.message, { cause: error });
  }

  let recovery: { pending: PendingAccountDeletion; proof: AccountDeletionRecoveryProof } | null = null;
  let createdRecovery = false;
  try {
    recovery = await loadDeletionRecovery();
    if (recovery && recovery.proof.ownerId !== ownerId) {
      throw new Error("Account deletion recovery proof belongs to another owner");
    }
    if (!recovery) {
      const proof = await createDeletionRecovery(ownerId);
      createdRecovery = true;
      const pending = await persistDeletionRecovery(proof);
      recovery = { pending, proof };
    }
  } catch (error) {
    if (error instanceof AccountDeletionCleanupPendingError) throw error;
    if (createdRecovery) await discardDeletionRecovery().catch(() => undefined);
    await registeredCleanup.rollback().catch(() => undefined);
    resume();
    const authError = normalizeAuthError(error, "network_error");
    throw new AuthFlowError(authError.code, authError.message, { cause: error });
  }

  if (recovery.pending.state === "requested") {
    try {
      await deleteRemoteAccount(accessToken, recovery.proof.operationId, recovery.proof.recoverySecret);
      await markDeletionState(recovery.proof.operationId, "server_confirmed");
    } catch (error) {
      // The server may have committed while the response was lost. Keep the
      // durable intent, proof and paused local state so retry/restart can
      // reconcile the same operation instead of treating a later 401 as success.
      throw new AccountDeletionCleanupPendingError(error);
    }
  }

  try {
    await markDeletionState(recovery.proof.operationId, "local_cleanup");
    await registeredCleanup.commit();
    await clearAuthSession(recovery.proof.operationId);
  } catch (error) {
    // The server has already deleted the account. Keep auth/data operations
    // paused and preserve the registered cleanup so the same UI action can
    // retry local purging without issuing DELETE a second time.
    throw new AccountDeletionCleanupPendingError(error);
  }

  markDeletionComplete?.();
  resume();
}

export async function deleteRemoteAccountWithRefresh(input: {
  accessToken: string | null;
  operationId: string;
  recoverySecret: string;
  deleteRemoteAccount: (accessToken: string | null, operationId: string, recoverySecret: string) => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  refreshSession: (refreshToken: string) => Promise<AuthRefreshResult>;
  persistRefreshedSession: (session: AuthRefreshResult) => Promise<void>;
}) {
  try {
    await input.deleteRemoteAccount(input.accessToken, input.operationId, input.recoverySecret);
    return;
  } catch (error) {
    const authError = normalizeAuthError(error);
    if (authError.code !== "session_expired" && authError.code !== "invalid_refresh_token") throw error;

    const refreshToken = await input.getRefreshToken();
    if (!refreshToken) throw new AuthFlowError("session_expired", undefined, { cause: error });
    const refreshed = await input.refreshSession(refreshToken);
    await input.persistRefreshedSession(refreshed);
    await input.deleteRemoteAccount(refreshed.accessToken, input.operationId, input.recoverySecret);
  }
}

export async function reconcilePendingAccountDeletion(input: {
  expectedOwnerId: string;
  accessToken: string | null;
  operationId: string;
  recoverySecret: string;
  deleteRemoteAccount: (accessToken: string | null, operationId: string, recoverySecret: string) => Promise<void>;
  getCurrentUser: (accessToken: string) => Promise<{ id: string }>;
  getRefreshToken: () => Promise<string | null>;
  refreshSession: (refreshToken: string) => Promise<AuthRefreshResult>;
  persistRefreshedSession: (session: AuthRefreshResult) => Promise<void>;
}) {
  try {
    // A completed operation is proof-bound and can be reconciled without any
    // account credential. This must happen before considering the current
    // session because the device may have signed into a different account.
    await input.deleteRemoteAccount(null, input.operationId, input.recoverySecret);
    return;
  } catch (error) {
    const authError = normalizeAuthError(error);
    if (authError.code !== "session_expired" && authError.code !== "invalid_refresh_token") throw error;
  }

  let accessToken = input.accessToken;
  if (accessToken) {
    let user: { id: string } | null = null;
    try {
      user = await input.getCurrentUser(accessToken);
    } catch (error) {
      const authError = normalizeAuthError(error);
      if (authError.code !== "session_expired" && authError.code !== "invalid_refresh_token") throw error;
      accessToken = null;
    }
    if (user) assertRecoveryOwner(user.id, input.expectedOwnerId);
  }

  if (!accessToken) {
    const refreshToken = await input.getRefreshToken();
    if (!refreshToken) throw new AuthFlowError("session_expired");
    const refreshed = await input.refreshSession(refreshToken);
    const user = await input.getCurrentUser(refreshed.accessToken);
    assertRecoveryOwner(user.id, input.expectedOwnerId);
    await input.persistRefreshedSession(refreshed);
    accessToken = refreshed.accessToken;
  }

  await input.deleteRemoteAccount(accessToken, input.operationId, input.recoverySecret);
}

function assertRecoveryOwner(actualOwnerId: string, expectedOwnerId: string) {
  if (actualOwnerId !== expectedOwnerId) {
    throw new AuthFlowError(
      "session_expired",
      "Нельзя завершить удаление: текущая сессия принадлежит другому аккаунту"
    );
  }
}
