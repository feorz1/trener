import type { AuthState } from "./types";

export const SIGN_IN_ROUTE = "/sign-in";
export const AUTH_CONNECTION_ERROR_ROUTE = "/auth/connection-error";

export type AuthRouteDecision = "allow" | "redirect_to_sign_in" | "redirect_to_app" | "redirect_to_connection_error";

const publicRoutes = new Set([SIGN_IN_ROUTE, "/auth/email", "/auth/code", AUTH_CONNECTION_ERROR_ROUTE]);

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.split("?")[0]?.replace(/\/$/, "") || "/";
}

export function getAuthRouteDecision(authState: AuthState, pathname: string): AuthRouteDecision {
  const normalizedPathname = normalizePathname(pathname);
  const isPublicRoute = publicRoutes.has(normalizedPathname);

  if (authState.status === "checking" || authState.status === "authenticating") return "allow";

  if (authState.status === "error") {
    return normalizedPathname === AUTH_CONNECTION_ERROR_ROUTE ? "allow" : "redirect_to_connection_error";
  }

  if (authState.status === "authenticated") {
    return isPublicRoute ? "redirect_to_app" : "allow";
  }

  return isPublicRoute ? "allow" : "redirect_to_sign_in";
}
