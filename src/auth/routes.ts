import type { AuthState } from "./types";

export const SIGN_IN_ROUTE = "/sign-in";

export type AuthRouteDecision = "allow" | "redirect_to_sign_in" | "redirect_to_app";

const publicRoutes = new Set([SIGN_IN_ROUTE, "/storybook"]);

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") return "/";
  return pathname.split("?")[0]?.replace(/\/$/, "") || "/";
}

export function getAuthRouteDecision(authState: AuthState, pathname: string): AuthRouteDecision {
  const normalizedPathname = normalizePathname(pathname);
  const isPublicRoute = publicRoutes.has(normalizedPathname);

  if (authState.status === "loading") return "allow";
  if (authState.status === "signed_in") {
    return normalizedPathname === SIGN_IN_ROUTE ? "redirect_to_app" : "allow";
  }

  return isPublicRoute ? "allow" : "redirect_to_sign_in";
}
