export type AccountDeletionResult = {
  email: string | null;
  alreadyCompleted: boolean;
};

export type AccountDeletionReceipt = {
  operationId: string;
  recoverySecretHash: string;
  createdAt: Date;
  completedAt: Date;
  expiresAt: Date;
};

export interface AccountDeletionRepository {
  findDeletionReceipt(operationId: string): Promise<AccountDeletionReceipt | null>;
  deleteAccount(
    userId: string,
    operationId: string,
    recoverySecretHash: string,
    expiresAt: Date
  ): Promise<AccountDeletionResult>;
}
