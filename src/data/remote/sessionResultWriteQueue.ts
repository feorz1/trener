export class SessionResultWriteQueue {
  private readonly tails = new Map<string, Promise<unknown>>();
  private paused = false;
  private closed = false;

  enqueue<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    if (this.paused || this.closed) {
      return Promise.reject(new Error("Session result writes are paused"));
    }
    const previous = this.tails.get(sessionId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const tail = current.then(() => undefined, () => undefined).finally(() => {
      if (this.tails.get(sessionId) === tail) {
        this.tails.delete(sessionId);
      }
    });

    this.tails.set(sessionId, tail);
    return current;
  }

  async pauseAndDrain() {
    this.paused = true;
    await Promise.allSettled([...this.tails.values()]);
  }

  resume() {
    if (!this.closed) {
      this.paused = false;
    }
  }

  async close() {
    this.paused = true;
    this.closed = true;
    await Promise.allSettled([...this.tails.values()]);
  }
}
