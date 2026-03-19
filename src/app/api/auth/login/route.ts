import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { apiError } from "@/lib/api-response";
import { buildRateLimitKey, checkRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/services/auth-schemas";

const LOGIN_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000,
};
import { loginUser } from "@/services/auth-service";

export async function POST(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateLimit = checkRateLimit({
    key: buildRateLimitKey(["login", forwardedFor]),
    limit: LOGIN_RATE_LIMIT.limit,
    windowMs: LOGIN_RATE_LIMIT.windowMs,
  });

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many login attempts. Please try again later.",
      429,
      {
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      }
    );
  }
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);
    const headersStore = await headers();

    const result = await loginUser(input, {
      ipAddress: headersStore.get("x-forwarded-for"),
      userAgent: headersStore.get("user-agent"),
    });

    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE_NAME,
      result.sessionValue,
      getSessionCookieOptions(result.expiresAt)
    );

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        expiresAt: result.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid login payload",
            details: error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LOGIN_FAILED",
          message: error instanceof Error ? error.message : "Login failed",
        },
      },
      { status: 401 }
    );
  }
}
