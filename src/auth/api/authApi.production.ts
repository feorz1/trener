import { authConfig } from "../config";
import type { AuthApiClient } from "../types";
import { createHttpAuthApi, createUnavailableAuthApi } from "./httpAuthApi";

export { createHttpAuthApi } from "./httpAuthApi";

export function createDefaultAuthApi(): AuthApiClient {
  if (!authConfig.apiBaseUrl) {
    return createUnavailableAuthApi("Backend URL is not configured");
  }
  return createHttpAuthApi({ baseUrl: authConfig.apiBaseUrl });
}
