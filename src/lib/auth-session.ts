import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "waraqhur_session";

// عمليًا: إبقاء المستخدم مسجل الدخول حتى يسجل خروج بنفسه (100 سنة)
const SESSION_TTL_DAYS = 36500;

function getSessionSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.appSessionSecret);
}

function shouldUseSecureCookies() {
  return env.appUrl.startsWith("https://");
}

export function generateSessionToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function signSessionValue(payload: {
  sessionId: string;
  userId: string;
  token: string;
  expiresAt: Date;
}): Promise<string> {
  return new SignJWT({
    sid: payload.sessionId,
    token: payload.token,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(payload.expiresAt.getTime() / 1000))
    .sign(getSessionSecretKey());
}

export async function verifySignedSessionValue(value: string): Promise<{
  sessionId: string;
  userId: string;
  token: string;
}> {
  const verified = await jwtVerify(value, getSessionSecretKey());

  const sessionId = verified.payload.sid;
  const userId = verified.payload.sub;
  const token = verified.payload.token;

  if (
    typeof sessionId !== "string" ||
    typeof userId !== "string" ||
    typeof token !== "string"
  ) {
    throw new Error("Invalid session payload");
  }

  return {
    sessionId,
    userId,
    token,
  };
}

export function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
