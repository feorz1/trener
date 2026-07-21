import type { AuthServerConfig } from "../config";
import type { AdminRepository } from "./types";
import { InMemoryAdminRepository } from "./InMemoryAdminRepository";
import { PrismaAdminRepository } from "./PrismaAdminRepository";

export function createAdminRepository(config: AuthServerConfig): AdminRepository {
  if (!config.databaseUrl) return new InMemoryAdminRepository();
  return new PrismaAdminRepository();
}
