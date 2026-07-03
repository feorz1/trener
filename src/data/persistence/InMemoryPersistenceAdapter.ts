import type { PersistedSnapshot } from "./PersistedSnapshot";
import type { PersistenceAdapter } from "./PersistenceAdapter";

function cloneSnapshot(snapshot: PersistedSnapshot): PersistedSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as PersistedSnapshot;
}

export class InMemoryPersistenceAdapter implements PersistenceAdapter {
  private snapshot: PersistedSnapshot | null = null;

  async load() {
    return this.snapshot ? cloneSnapshot(this.snapshot) : null;
  }

  async save(snapshot: PersistedSnapshot) {
    this.snapshot = cloneSnapshot(snapshot);
  }

  async clear() {
    this.snapshot = null;
  }

  async hasData() {
    return this.snapshot !== null;
  }
}
