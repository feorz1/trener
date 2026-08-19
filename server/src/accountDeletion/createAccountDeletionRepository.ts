import type { AdminRepository } from "../admin/types";
import { InMemoryAdminRepository } from "../admin/InMemoryAdminRepository";
import type { AuthServerConfig } from "../config";
import type { TrainerDataRepository } from "../data/types";
import { InMemoryTrainerDataRepository } from "../data/InMemoryTrainerDataRepository";
import type { AuthRepository } from "../repositories/AuthRepository";
import { InMemoryAuthRepository } from "../repositories/InMemoryAuthRepository";
import { InMemoryAccountDeletionRepository } from "./InMemoryAccountDeletionRepository";
import { PrismaAccountDeletionRepository } from "./PrismaAccountDeletionRepository";
import type { AccountDeletionRepository } from "./types";

type AccountDeletionDependencies = {
  authRepository: AuthRepository;
  dataRepository: TrainerDataRepository;
  adminRepository: AdminRepository;
};

export function createAccountDeletionRepository(
  config: AuthServerConfig,
  dependencies: AccountDeletionDependencies
): AccountDeletionRepository {
  if (config.databaseUrl) return new PrismaAccountDeletionRepository();

  if (
    !(dependencies.authRepository instanceof InMemoryAuthRepository) ||
    !(dependencies.dataRepository instanceof InMemoryTrainerDataRepository) ||
    !(dependencies.adminRepository instanceof InMemoryAdminRepository)
  ) {
    throw new Error("In-memory account deletion requires in-memory auth, data, and admin repositories");
  }

  return new InMemoryAccountDeletionRepository(
    dependencies.authRepository,
    dependencies.dataRepository,
    dependencies.adminRepository
  );
}
