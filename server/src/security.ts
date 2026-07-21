import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { AuthApiError } from "./errors";

type AccessTokenClaims = {
  sub: string;
  type: "access";
  iat: number;
  exp: number;
};

export function randomToken(byteLength = 32) {
  return base64Url(randomBytes(byteLength));
}

export function randomNumericCode(length: number) {
  const max = 10 ** length;
  const value = Number.parseInt(randomBytes(6).toString("hex"), 16) % max;
  return value.toString().padStart(length, "0");
}

export function hashSecret(value: string, pepper: string) {
  return createHmac("sha256", pepper).update(value).digest("base64url");
}

export function safeCompareHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function signAccessToken(params: { userId: string; secret: string; ttlMinutes: number }) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = nowSeconds + params.ttlMinutes * 60;
  const header = { alg: "HS256", typ: "JWT" };
  const payload: AccessTokenClaims = {
    sub: params.userId,
    type: "access",
    iat: nowSeconds,
    exp: expiresAtSeconds
  };
  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payload);
  const signature = sign(`${encodedHeader}.${encodedPayload}`, params.secret);
  return {
    token: `${encodedHeader}.${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000)
  };
}

export function verifyAccessToken(token: string, secret: string): AccessTokenClaims {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new AuthApiError("session_expired", 401);
  }
  const expected = sign(`${encodedHeader}.${encodedPayload}`, secret);
  if (!safeCompareHash(signature, expected)) {
    throw new AuthApiError("session_expired", 401);
  }
  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AccessTokenClaims;
  if (payload.type !== "access" || !payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AuthApiError("session_expired", 401);
  }
  return payload;
}

export function encryptSecret(value: string, secret: string) {
  const key = createHmac("sha256", "oauth-state").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64Url(iv)}.${base64Url(tag)}.${base64Url(encrypted)}`;
}

export function decryptSecret(value: string, secret: string) {
  const [encodedIv, encodedTag, encodedEncrypted] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedEncrypted) {
    throw new AuthApiError("oauth_failed", 400);
  }
  const key = createHmac("sha256", "oauth-state").update(secret).digest();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encodedEncrypted, "base64url")), decipher.final()]).toString("utf8");
}

function encodeJson(value: unknown) {
  return base64Url(Buffer.from(JSON.stringify(value), "utf8"));
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64Url(value: Buffer) {
  return value.toString("base64url");
}
