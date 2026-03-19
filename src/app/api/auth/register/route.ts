import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerSchema } from "@/services/auth-schemas";
import { registerUser } from "@/services/auth-service";

export async function POST(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateLimit = checkRateLimit({
    key: buildRateLimitKey(["register", forwardedFor]),
    limit: REGISTER_RATE_LIMIT.limit,
    windowMs: REGISTER_RATE_LIMIT.windowMs,
  });

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many registration attempts. Please try again later.",
      429,
      {
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      }
    );
  }
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);
    const user = await registerUser(input);

    return NextResponse.json(
      {
        success: true,
        data: {
          user,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid registration payload",
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
          code: "REGISTER_FAILED",
          message: error instanceof Error ? error.message : "Registration failed",
        },
      },
      { status: 400 }
    );
  }
}
