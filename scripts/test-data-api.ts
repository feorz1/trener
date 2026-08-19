import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createDataApi } from "../src/data/api/dataApi";
import { DataError } from "../src/data/contracts";
import { SessionResultWriteQueue } from "../src/data/remote/sessionResultWriteQueue";
import { NetworkTimeoutError } from "../src/utils/networkTimeout";

type Scope = Record<string, unknown>;

const dataProviderPath = fileURLToPath(new URL("../src/data/DataProvider.tsx", import.meta.url));
const dataProviderSource = readFileSync(dataProviderPath, "utf8");
const dataProviderSourceFile = ts.createSourceFile(dataProviderPath, dataProviderSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function getFunctionSource(name: string) {
  let declaration: ts.FunctionDeclaration | undefined;

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      declaration = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(dataProviderSourceFile);
  if (!declaration) throw new Error(`DataProvider function ${name} was not found`);
  return declaration.getText(dataProviderSourceFile);
}

function compileFunction<T>(name: string, scope: Scope = {}) {
  const compiled = ts.transpileModule(`${getFunctionSource(name)}\nconst __subject = ${name};`, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const names = Object.keys(scope);
  return new Function(...names, `${compiled}; return __subject;`)(...names.map((key) => scope[key])) as T;
}

const optionalTrim = compileFunction<(value?: string) => string | undefined>("optionalTrim");
const requiredTrim = compileFunction<(value: string, fallback: string) => string>("requiredTrim");
const trimList = compileFunction<(values: string[]) => string[]>("trimList");
const localClientStatusToRemote = compileFunction<(status?: string) => "active" | "archived" | undefined>("localClientStatusToRemote");
const normalizeClientIntake = compileFunction<(intake?: Record<string, unknown>) => Record<string, unknown> | undefined>("normalizeClientIntake", {
  optionalTrim,
  trimList
});
const mergeClientIntake = compileFunction<(current?: Record<string, unknown>, patch?: Record<string, unknown>) => Record<string, unknown> | undefined>(
  "mergeClientIntake",
  { normalizeClientIntake }
);
const toRemoteClientIntake = compileFunction<(intake: Record<string, unknown>) => Record<string, unknown> | undefined>("toRemoteClientIntake", {
  optionalTrim,
  trimList
});
const toRemoteClientProfile = compileFunction<(input: Record<string, unknown>) => Record<string, unknown> | undefined>("toRemoteClientProfile", {
  optionalTrim,
  trimList,
  toRemoteClientIntake
});
const toRemoteClientInput = compileFunction<(input: Record<string, unknown>) => Record<string, unknown>>("toRemoteClientInput", {
  localClientStatusToRemote,
  optionalTrim,
  requiredTrim,
  toRemoteClientProfile
});

const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
const api = createDataApi({
  baseUrl: "https://api.example.test/",
  authorizedFetch: async (input, init) => {
    calls.push({ input, init });
    return Response.json({ id: "client-a", trainerId: "server-user", name: "Alice", status: "active" });
  }
});

async function main() {
  const localCreateInput = {
    name: " Alice ",
    telegram: " @alice ",
    gender: "female",
    goal: " Поддержать форму ",
    restrictions: [" Без осевых нагрузок ", ""],
    status: "new",
    metrics: { weightKg: 64, heightCm: 170, attendanceRate: 92 },
    intake: {
      ageYears: 31,
      targetWeightKg: 60,
      healthConstraints: [" Травмы спины "],
      exerciseRestrictions: [" Без осевых нагрузок "],
      activityLevel: " Активная ",
      sleep: " 6-8 часов ",
      workoutsPerWeek: 3,
      trainingExperience: " Занимаюсь регулярно ",
      sports: [" Футбол "]
    }
  };
  const remoteCreateInput = toRemoteClientInput(localCreateInput);
  await api.createClient({ ...remoteCreateInput, trainerId: "client-user" } as Parameters<typeof api.createClient>[0] & { name: string; trainerId: string });

  assert.equal(String(calls[0].input), "https://api.example.test/clients");
  assert.equal(calls[0].init?.method, "POST");
  const createPayload = JSON.parse(String(calls[0].init?.body));
  assert.equal(createPayload.trainerId, undefined);
  assert.equal(createPayload.name, "Alice");
  assert.deepEqual(createPayload.profile, {
    telegram: "@alice",
    gender: "female",
    goal: "Поддержать форму",
    restrictions: ["Без осевых нагрузок"],
    metrics: { weightKg: 64, heightCm: 170, attendanceRate: 92 },
    intake: {
      ageYears: 31,
      targetWeightKg: 60,
      healthConstraints: ["Травмы спины"],
      exerciseRestrictions: ["Без осевых нагрузок"],
      activityLevel: "Активная",
      sleep: "6-8 часов",
      workoutsPerWeek: 3,
      trainingExperience: "Занимаюсь регулярно",
      sports: ["Футбол"]
    }
  });

  const remotePatch = toRemoteClientInput({ goal: " Новая цель ", intake: { sleep: " Больше 8 часов ", sports: [] } });
  assert.deepEqual(remotePatch, { profile: { goal: "Новая цель", intake: { sleep: "Больше 8 часов", sports: [] } } });
  await api.updateClient("client-a", remotePatch);
  assert.equal(String(calls[1].input), "https://api.example.test/clients/client-a");
  assert.equal(calls[1].init?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)), remotePatch);

  assert.deepEqual(toRemoteClientInput({ telegram: " ", goal: " ", intake: { activityLevel: " ", sleep: " ", trainingExperience: " " } }), {
    profile: { telegram: "", goal: "", intake: { activityLevel: "", sleep: "", trainingExperience: "" } }
  });

  assert.deepEqual(
    mergeClientIntake(
      { healthConstraints: ["Травмы спины"], exerciseRestrictions: ["Без осевых нагрузок"], sleep: "6-8 часов", sports: ["Футбол"] },
      { sleep: " Больше 8 часов ", sports: [] }
    ),
    { healthConstraints: ["Травмы спины"], exerciseRestrictions: ["Без осевых нагрузок"], sleep: "Больше 8 часов", sports: [] }
  );

  assert.deepEqual(mergeClientIntake({ sleep: "6-8 часов" }, { sleep: " " }), { sleep: "" });

  const persistedResultId = "11111111-1111-4111-8111-111111111111";
  await api.upsertWorkoutSessionResults("session-a", {
    items: [
      {
        id: "session-item-a",
        setResults: [
          { id: "result-local-generated", setNumber: 1, reps: 8, completed: true },
          { id: persistedResultId, setNumber: 2, reps: 6, completed: true }
        ]
      }
    ]
  });

  const resultPayload = JSON.parse(String(calls[2].init?.body));
  assert.equal(resultPayload.items[0].setResults[0].id, undefined);
  assert.equal(resultPayload.items[0].setResults[1].id, persistedResultId);

  const failingApi = createDataApi({
    baseUrl: "https://api.example.test",
    authorizedFetch: async () => Response.json({ code: "validation" }, { status: 400 })
  });

  await assert.rejects(() => failingApi.createExercise({ name: "" }), (error) => {
    assert.ok(error instanceof DataError);
    assert.equal(error.message, "Проверьте данные и попробуйте ещё раз.");
    return true;
  });

  const businessValidationApi = createDataApi({
    baseUrl: "https://api.example.test",
    authorizedFetch: async () =>
      Response.json(
        { code: "validation", message: "Нельзя изменить состав уже начатой тренировки" },
        { status: 400 }
      )
  });

  await assert.rejects(() => businessValidationApi.updateWorkoutSession("session-a", { items: [] }), (error) => {
    assert.ok(error instanceof DataError);
    assert.equal(error.message, "Нельзя изменить состав уже начатой тренировки");
    return true;
  });

  let readSignal: AbortSignal | undefined;
  const neverResolvingReadApi = createDataApi({
    baseUrl: "https://api.example.test",
    timeoutMs: 5,
    authorizedFetch: async (_input, init) => {
      readSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    }
  });

  await assert.rejects(() => neverResolvingReadApi.getClients(), NetworkTimeoutError);
  assert.equal(readSignal?.aborted, true, "Read timeout must abort the full authorized request, even if fetch ignores the signal");

  let mutationSignal: AbortSignal | undefined;
  const neverResolvingMutationApi = createDataApi({
    baseUrl: "https://api.example.test",
    timeoutMs: 5,
    authorizedFetch: async (_input, init) => {
      mutationSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    }
  });
  const queue = new SessionResultWriteQueue();

  await assert.rejects(
    () => queue.enqueue("session-timeout", () => neverResolvingMutationApi.updateWorkoutSession("session-timeout", { notes: "pending" })),
    NetworkTimeoutError
  );
  assert.equal(mutationSignal?.aborted, true, "Mutation timeout must abort the full authorized request");
  assert.equal(
    await queue.enqueue("session-timeout", async () => "next-write"),
    "next-write",
    "A timed-out mutation must release its per-session write queue"
  );

  console.log("Data API tests passed.");
}

void main();
