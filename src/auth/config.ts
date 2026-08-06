import type { AuthProvidersAvailability } from "./types";

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || (!isProduction ? "https://api.trener-app.com" : undefined);
const requestedMockAuth = readBooleanEnv(process.env.EXPO_PUBLIC_USE_MOCK_AUTH ?? process.env.EXPO_PUBLIC_AUTH_MOCK_ENABLED, false);

export const authConfig = {
  authEnabled: readBooleanEnv(process.env.EXPO_PUBLIC_AUTH_ENABLED, true),
  emailAuthEnabled: readBooleanEnv(process.env.EXPO_PUBLIC_EMAIL_AUTH_ENABLED, true),
  useMockBackend: requestedMockAuth && !isProduction,
  hasProductionConfigError: isProduction && !apiBaseUrl,
  apiBaseUrl
} as const;

export const envProvidersAvailability: AuthProvidersAvailability = {
  email: authConfig.emailAuthEnabled,
  yandex: false,
  vk: false
};

export function mergeProviderAvailability(serverProviders: AuthProvidersAvailability | null | undefined): AuthProvidersAvailability {
  return {
    email: authConfig.emailAuthEnabled && (serverProviders?.email ?? true),
    yandex: false,
    vk: false
  };
}
