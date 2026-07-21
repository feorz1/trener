import type { ClientProfileInput, ClientProfileRecord } from "./types";

export function mergeClientProfile(current: ClientProfileRecord, patch: ClientProfileInput | undefined): ClientProfileRecord {
  if (patch === undefined) return current;

  const { metrics, intake, ...profile } = patch;
  return {
    ...current,
    ...profile,
    ...(metrics !== undefined ? { metrics: { ...current.metrics, ...metrics } } : {}),
    ...(intake !== undefined ? { intake: { ...current.intake, ...intake } } : {})
  };
}

export function clientProfileFromJson(value: unknown): ClientProfileRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ClientProfileRecord;
}
