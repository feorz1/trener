import type { LocalDataState } from "../local/localState";
import type { PersistenceAdapter } from "./PersistenceAdapter";
import { serializeDataState } from "./serializeSnapshot";

export type PersistenceStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export class PersistenceCoordinator {
  private pendingState: LocalDataState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private status: PersistenceStatus = "idle";
  private paused = false;
  private closed = false;

  constructor(
    private readonly adapter: PersistenceAdapter,
    private readonly debounceMs = 500
  ) {}

  getStatus() {
    return this.status;
  }

  scheduleSave(state: LocalDataState) {
    if (this.paused || this.closed) return;
    this.pendingState = state;
    this.status = "dirty";

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      void this.flush().catch(() => undefined);
    }, this.debounceMs);
  }

  saveImmediately(state: LocalDataState) {
    if (this.closed) return Promise.reject(new Error("Persistence coordinator is closed"));
    if (this.paused) return Promise.reject(new Error("Persistence coordinator is paused"));
    this.pendingState = state;
    return this.flush();
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const stateToSave = this.pendingState;
    if (!stateToSave) {
      await this.writeChain;
      return;
    }

    this.pendingState = null;
    const snapshot = serializeDataState(stateToSave);
    this.status = "saving";
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(() => this.adapter.save(snapshot))
      .then(() => {
        if (!this.pendingState) {
          this.status = "saved";
        }
      })
      .catch((error) => {
        this.pendingState = this.pendingState ?? stateToSave;
        this.status = "error";
        throw error;
      });

    await this.writeChain;
  }

  async pauseAndDrain() {
    if (this.closed) return;
    this.paused = true;
    await this.flush();
  }

  resume() {
    if (!this.closed) {
      this.paused = false;
    }
  }

  async closeAndClear() {
    this.paused = true;
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingState = null;
    await this.writeChain.catch(() => undefined);
    await this.adapter.clear();
    this.status = "idle";
  }

  cancelPending() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingState = null;
    this.status = "idle";
  }
}
