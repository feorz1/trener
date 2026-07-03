import type { PersistedSnapshot } from "./PersistedSnapshot";

export interface PersistenceAdapter {
  load(): Promise<unknown | null>;
  save(snapshot: PersistedSnapshot): Promise<void>;
  clear(): Promise<void>;
  hasData(): Promise<boolean>;
}

export class PersistenceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "PersistenceError";
  }
}
