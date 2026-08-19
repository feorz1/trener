import type { AuthServerConfig } from "../config";
import type { NormalizedOAuthProfile, OAuthProvider, OAuthProviderAdapter } from "../types";

type OAuthProviderConfig = AuthServerConfig["oauth"][OAuthProvider];

export function createOAuthAdapters(config: AuthServerConfig): Record<OAuthProvider, OAuthProviderAdapter> {
  return {
    yandex: new YandexOAuthAdapter(config.oauth.yandex),
    vk: new VkOAuthAdapter(config.oauth.vk)
  };
}

abstract class HttpOAuthAdapter implements OAuthProviderAdapter {
  abstract readonly provider: OAuthProvider;

  constructor(protected readonly config: OAuthProviderConfig) {}

  async getAuthorizationUrl(params: { state: string; redirectUri: string; codeChallenge?: string }) {
    const url = new URL(this.config.authorizationUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", requireConfig(this.config.clientId, `${this.provider} client id`));
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("state", params.state);
    if (this.config.scopes.length > 0) {
      url.searchParams.set("scope", this.config.scopes.join(" "));
    }
    if (params.codeChallenge) {
      url.searchParams.set("code_challenge", params.codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
    }
    return url.toString();
  }

  async exchangeCode(params: { code: string; redirectUri: string; codeVerifier?: string }) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      client_id: requireConfig(this.config.clientId, `${this.provider} client id`),
      client_secret: requireConfig(this.config.clientSecret, `${this.provider} client secret`),
      redirect_uri: params.redirectUri
    });
    if (params.codeVerifier) {
      body.set("code_verifier", params.codeVerifier);
    }
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${this.provider} token exchange failed`);
    }
    return payload;
  }

  protected async fetchProfileWithBearer(providerTokens: unknown) {
    const accessToken = readStringField(providerTokens, "access_token");
    if (!accessToken) throw new Error(`${this.provider} token response did not include access_token`);
    const response = await fetch(this.config.profileUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`${this.provider} profile request failed`);
    }
    return payload;
  }

  abstract getProfile(providerTokens: unknown): Promise<NormalizedOAuthProfile>;
}

export class YandexOAuthAdapter extends HttpOAuthAdapter {
  readonly provider = "yandex" as const;

  async getProfile(providerTokens: unknown): Promise<NormalizedOAuthProfile> {
    const profile = await this.fetchProfileWithBearer(providerTokens);
    const subject = readStringField(profile, "id") || readStringField(profile, "client_id");
    if (!subject) throw new Error("Yandex profile did not include a stable id");
    const displayName = readStringField(profile, "real_name") || readStringField(profile, "display_name") || readStringField(profile, "login");
    return {
      provider: this.provider,
      subject,
      email: readStringField(profile, "default_email"),
      emailVerified: Boolean(readUnknownField(profile, "default_email")),
      displayName,
      avatarUrl: buildYandexAvatarUrl(readStringField(profile, "default_avatar_id")),
      rawProfile: profile
    };
  }
}

export class VkOAuthAdapter extends HttpOAuthAdapter {
  readonly provider = "vk" as const;

  async getProfile(providerTokens: unknown): Promise<NormalizedOAuthProfile> {
    const profile = await this.fetchProfileWithBearer(providerTokens);
    const user = readUnknownField(profile, "user") ?? profile;
    const subject = readStringField(user, "user_id") || readStringField(user, "id") || readStringField(user, "sub");
    if (!subject) throw new Error("VK profile did not include a stable id");
    const firstName = readStringField(user, "first_name") || readStringField(user, "given_name");
    const lastName = readStringField(user, "last_name") || readStringField(user, "family_name");
    const displayName = readStringField(user, "name") || [firstName, lastName].filter(Boolean).join(" ") || null;
    return {
      provider: this.provider,
      subject,
      email: readStringField(user, "email") || readStringField(profile, "email"),
      emailVerified: Boolean(readStringField(user, "email") || readStringField(profile, "email")),
      displayName,
      avatarUrl: readStringField(user, "avatar") || readStringField(user, "photo_200") || readStringField(user, "picture"),
      rawProfile: profile
    };
  }
}

function requireConfig(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function readUnknownField(value: unknown, field: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[field] : undefined;
}

function readStringField(value: unknown, field: string) {
  const raw = readUnknownField(value, field);
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

function buildYandexAvatarUrl(avatarId: string | null) {
  return avatarId ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200` : null;
}
