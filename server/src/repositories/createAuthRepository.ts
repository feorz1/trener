import type { AuthServerConfig } from "../config";
import { InMemoryAuthRepository } from "./InMemoryAuthRepository";
import { PrismaAuthRepository } from "./PrismaAuthRepository";

export function createAuthRepository(config: AuthServerConfig) {
  if (config.databaseUrl) {
    return new PrismaAuthRepository();
  }
  return new InMemoryAuthRepository();
}
