import type { AuthRefreshResult } from "./types";
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
  deleteRemoteAccount: (accessToken: string) => Promise<void>;
  clearAuthSession: () => Promise<void>;
  remoteDeletionConfirmed?: boolean;
  markRemoteDeletionConfirmed?: () => void | Promise<void>;
  markDeletionComplete?: () => void;
};

export class AccountDeletionCleanupPendingError extends AuthFlowError {
  constructor(cause: unknown) {
    super(
      "server_error",
      "Аккаунт уже удалён. Повторите очистку данных на этом устройстве.",
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
    deleteRemoteAccount,
    clearAuthSession,
    remoteDeletionConfirmed = false,
    markRemoteDeletionConfirmed,
    markDeletionComplete
  } = input;
  if (!accessToken || !ownerId) {
    throw new AuthFlowError("session_expired");
  }
  if (!registeredCleanup || registeredCleanup.ownerId !== ownerId) {
    throw new AuthFlowError("server_error", "Локальные данные аккаунта ещё не готовы");
  }

  if (!remoteDeletionConfirmed) {
    try {
      await pauseAndDrain();
      await registeredCleanup.prepare();
    } catch (error) {
      resume();
      await registeredCleanup.rollback().catch(() => undefined);
      const authError = normalizeAuthError(error, "server_error");
      throw new AuthFlowError(authError.code, authError.message, { cause: error });
    }

    try {
      await deleteRemoteAccount(accessToken);
    } catch (error) {
      await registeredCleanup.rollback().catch(() => undefined);
      resume();
      const authError = normalizeAuthError(error, "network_error");
      throw new AuthFlowError(authError.code, authError.message, { cause: error });
    }
  }

  try {
    // Re-write the durable marker on cleanup retries as well. The in-memory
    // confirmation is set synchronously before this promise can reject.
    await markRemoteDeletionConfirmed?.();
    await registeredCleanup.commit();
    await clearAuthSession();
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
  accessToken: string;
  deleteRemoteAccount: (accessToken: string) => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  refreshSession: (refreshToken: string) => Promise<AuthRefreshResult>;
  persistRefreshedSession: (session: AuthRefreshResult) => Promise<void>;
}) {
  try {
    await input.deleteRemoteAccount(input.accessToken);
    return;
  } catch (error) {
    const authError = normalizeAuthError(error);
    if (authError.code !== "session_expired" && authError.code !== "invalid_refresh_token") throw error;

    const refreshToken = await input.getRefreshToken();
    if (!refreshToken) throw new AuthFlowError("session_expired", undefined, { cause: error });
    const refreshed = await input.refreshSession(refreshToken);
    await input.persistRefreshedSession(refreshed);
    await input.deleteRemoteAccount(refreshed.accessToken);
  }
}
