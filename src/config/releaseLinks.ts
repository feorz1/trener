const PRIVACY_POLICY_ENV_KEY = "EXPO_PUBLIC_PRIVACY_POLICY_URL";
const SUPPORT_ENV_KEY = "EXPO_PUBLIC_SUPPORT_URL";

export const DEVELOPMENT_RELEASE_LINKS = {
  // Development may use the same public documents as the release build.
  // Overrides remain HTTPS-only so local URLs cannot enter an archive.
  privacyPolicyUrl: "https://api.trener-app.com/privacy",
  supportUrl: "https://api.trener-app.com/support"
} as const;

export type ReleaseLinks = {
  privacyPolicyUrl: string;
  supportUrl: string;
};

export type ReleaseLinksEnvironment = {
  NODE_ENV?: string;
  EXPO_PUBLIC_PRIVACY_POLICY_URL?: string;
  EXPO_PUBLIC_SUPPORT_URL?: string;
};

export class ReleaseLinksConfigurationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Release link configuration is invalid: ${issues.join(", ")}`);
    this.name = "ReleaseLinksConfigurationError";
  }
}

export function resolveReleaseLinks(environment: ReleaseLinksEnvironment): ReleaseLinks {
  const production = environment.NODE_ENV === "production";
  const issues: string[] = [];
  const privacyPolicyUrl = parseReleaseUrl({
    environmentKey: PRIVACY_POLICY_ENV_KEY,
    rawValue: environment.EXPO_PUBLIC_PRIVACY_POLICY_URL,
    fallback: DEVELOPMENT_RELEASE_LINKS.privacyPolicyUrl,
    production,
    issues
  });
  const supportUrl = parseReleaseUrl({
    environmentKey: SUPPORT_ENV_KEY,
    rawValue: environment.EXPO_PUBLIC_SUPPORT_URL,
    fallback: DEVELOPMENT_RELEASE_LINKS.supportUrl,
    production,
    issues
  });

  if (issues.length > 0 || !privacyPolicyUrl || !supportUrl) {
    throw new ReleaseLinksConfigurationError(issues.length > 0 ? issues : ["public release URLs are unavailable"]);
  }

  return { privacyPolicyUrl, supportUrl };
}

export const releaseLinks = resolveReleaseLinks({
  NODE_ENV: process.env.NODE_ENV,
  EXPO_PUBLIC_PRIVACY_POLICY_URL: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  EXPO_PUBLIC_SUPPORT_URL: process.env.EXPO_PUBLIC_SUPPORT_URL
});

function parseReleaseUrl({
  environmentKey,
  rawValue,
  fallback,
  production,
  issues
}: {
  environmentKey: string;
  rawValue: string | undefined;
  fallback: string;
  production: boolean;
  issues: string[];
}) {
  const candidate = rawValue?.trim() || (production ? undefined : fallback);
  if (!candidate) {
    issues.push(`${environmentKey} is required in production`);
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    issues.push(`${environmentKey} must be an absolute URL`);
    return undefined;
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    issues.push(`${environmentKey} must be a public URL without credentials, query parameters, or fragments`);
    return undefined;
  }

  if (parsed.protocol !== "https:") {
    issues.push(`${environmentKey} must use HTTPS`);
    return undefined;
  }

  return parsed.toString();
}
