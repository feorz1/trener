export type AccountDeletionResult = {
  email: string | null;
};

export interface AccountDeletionRepository {
  deleteAccount(userId: string): Promise<AccountDeletionResult>;
}
