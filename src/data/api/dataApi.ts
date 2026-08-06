import { DataError } from "../contracts";
import { withNetworkTimeout } from "../../utils/networkTimeout";
import type {
  AuthorizedFetch,
  DataApi,
  DataApiBootstrapPayload,
  DataApiClient,
  DataApiClientInput,
  DataApiExercise,
  DataApiExerciseInput,
  DataApiPage,
  DataApiWorkoutResultsInput,
  DataApiWorkoutSession,
  DataApiWorkoutSessionInput,
  DataApiWorkoutTemplate,
  DataApiWorkoutTemplateInput
} from "./dataApi.types";

type CreateDataApiInput = {
  baseUrl: string;
  authorizedFetch: AuthorizedFetch;
  timeoutMs?: number;
};

export function createDataApi({ baseUrl, authorizedFetch, timeoutMs }: CreateDataApiInput): DataApi {
  const rootUrl = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init: RequestInit = {}) {
    const response = await withNetworkTimeout(
      (signal) =>
        authorizedFetch(`${rootUrl}${path}`, {
          ...init,
          signal,
          headers: {
            Accept: "application/json",
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers
          }
        }),
      { timeoutMs, signal: init.signal }
    );

    if (!response.ok) {
      throw await toDataApiError(response);
    }

    return (await response.json()) as T;
  }

  function write<T>(method: "POST" | "PATCH", path: string, body?: unknown) {
    return request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(stripClientAuthority(body)) });
  }

  return {
    bootstrap: () => request<DataApiBootstrapPayload>("/sync/bootstrap"),
    getClients: async () => (await request<DataApiPage<DataApiClient>>("/clients")).data,
    createClient: (input) => write<DataApiClient>("POST", "/clients", input),
    updateClient: (id, patch) => write<DataApiClient>("PATCH", `/clients/${encodeURIComponent(id)}`, patch),
    deleteClient: (id) => request<DataApiClient>(`/clients/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getExercises: () => request<DataApiExercise[]>("/exercises"),
    createExercise: (input) => write<DataApiExercise>("POST", "/exercises", input),
    updateExercise: (id, patch) => write<DataApiExercise>("PATCH", `/exercises/${encodeURIComponent(id)}`, patch),
    deleteExercise: (id) => request<DataApiExercise>(`/exercises/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getWorkoutTemplates: () => request<DataApiWorkoutTemplate[]>("/workout-templates"),
    createWorkoutTemplate: (input) => write<DataApiWorkoutTemplate>("POST", "/workout-templates", input),
    updateWorkoutTemplate: (id, patch) => write<DataApiWorkoutTemplate>("PATCH", `/workout-templates/${encodeURIComponent(id)}`, patch),
    deleteWorkoutTemplate: (id) => request<DataApiWorkoutTemplate>(`/workout-templates/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getWorkoutSessions: () => request<DataApiPage<DataApiWorkoutSession>>("/workout-sessions"),
    createWorkoutSession: (input) => write<DataApiWorkoutSession>("POST", "/workout-sessions", input),
    updateWorkoutSession: (id, patch) => write<DataApiWorkoutSession>("PATCH", `/workout-sessions/${encodeURIComponent(id)}`, patch),
    deleteWorkoutSession: (id) => request<DataApiWorkoutSession>(`/workout-sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
    startWorkoutSession: (id) => write<DataApiWorkoutSession>("POST", `/workout-sessions/${encodeURIComponent(id)}/start`),
    completeWorkoutSession: (id) => write<DataApiWorkoutSession>("POST", `/workout-sessions/${encodeURIComponent(id)}/complete`),
    cancelWorkoutSession: (id) => write<DataApiWorkoutSession>("POST", `/workout-sessions/${encodeURIComponent(id)}/cancel`),
    getWorkoutSessionResults: (sessionId) => request<DataApiWorkoutSession>(`/workout-sessions/${encodeURIComponent(sessionId)}`),
    upsertWorkoutSessionResults: (sessionId, input: DataApiWorkoutResultsInput) =>
      write<DataApiWorkoutSession>("PATCH", `/workout-sessions/${encodeURIComponent(sessionId)}/results`, normalizeWorkoutResultsInput(input))
  };
}

function normalizeWorkoutResultsInput(input: DataApiWorkoutResultsInput): DataApiWorkoutResultsInput {
  return {
    items: input.items.map((item) => ({
      ...item,
      setResults: item.setResults.map(({ id, ...result }) => isUuid(id) ? { ...result, id } : result)
    }))
  };
}

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function stripClientAuthority(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const { trainerId: _trainerId, trainer_id: _trainer_id, ...rest } = input as Record<string, unknown>;
  return rest;
}

async function toDataApiError(response: Response) {
  let message = "Не удалось сохранить данные. Проверьте интернет и попробуйте ещё раз.";
  let code: "validation" | "not_found" | "unknown" = "unknown";

  try {
    const body = (await response.json()) as { code?: string; message?: string };
    if (body.code === "validation") {
      message = body.message && /[А-Яа-яЁё]/.test(body.message)
        ? body.message
        : "Проверьте данные и попробуйте ещё раз.";
      code = "validation";
    } else if (body.code === "not_found") {
      message = "Данные не найдены или больше недоступны.";
      code = "not_found";
    } else if (body.code === "forbidden") {
      message = "Нет доступа к этим данным.";
    } else if (body.code === "session_expired") {
      message = "Сессия истекла. Войдите снова.";
    } else if (body.message) {
      message = body.message;
    }
  } catch {
    if (response.status >= 500) {
      message = "Сервер временно недоступен. Попробуйте позже.";
    }
  }

  return new DataError(code, message, { retryable: response.status >= 500 || response.status === 429 });
}

export type {
  DataApi,
  DataApiBootstrapPayload,
  DataApiClient,
  DataApiClientInput,
  DataApiExercise,
  DataApiExerciseInput,
  DataApiPage,
  DataApiWorkoutResultsInput,
  DataApiWorkoutSession,
  DataApiWorkoutSessionInput,
  DataApiWorkoutTemplate,
  DataApiWorkoutTemplateInput
};
