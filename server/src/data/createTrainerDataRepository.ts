import type { AuthServerConfig } from "../config";
import { InMemoryTrainerDataRepository } from "./InMemoryTrainerDataRepository";
import { PrismaTrainerDataRepository } from "./PrismaTrainerDataRepository";

export function createTrainerDataRepository(config: AuthServerConfig) {
  if (config.databaseUrl) {
    return new PrismaTrainerDataRepository();
  }
  return new InMemoryTrainerDataRepository();
}
