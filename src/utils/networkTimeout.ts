export const DEFAULT_NETWORK_TIMEOUT_MS = 10_000;

export class NetworkTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Network request timed out after ${timeoutMs} ms`);
    this.name = "NetworkTimeoutError";
  }
}

type NetworkTimeoutOptions = {
  timeoutMs?: number;
  signal?: AbortSignal | null;
};

function createAbortError() {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

export async function withNetworkTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  { timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS, signal: externalSignal }: NetworkTimeoutOptions = {}
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbortListener: (() => void) | undefined;

  const externalAbortPromise = new Promise<never>((_, reject) => {
    if (!externalSignal) return;

    const handleExternalAbort = () => {
      const error = createAbortError();
      reject(error);
      controller.abort();
    };

    if (externalSignal.aborted) {
      handleExternalAbort();
      return;
    }

    externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
    removeExternalAbortListener = () => externalSignal.removeEventListener("abort", handleExternalAbort);
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new NetworkTimeoutError(timeoutMs);
      reject(error);
      controller.abort();
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve().then(() => run(controller.signal)), timeoutPromise, externalAbortPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    removeExternalAbortListener?.();
  }
}
