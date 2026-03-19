import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { passwordResetRequestSchema } from "@/services/auth-recovery-schemas";
import { requestPasswordReset } from "@/services/auth-recovery-service";

export async function POST(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const rateLimit = checkRateLimit({
    key: buildRateLimitKey(["password-reset-request", forwardedFor]),
    limit: PASSWORD_RESET_RATE_LIMIT.limit,
    windowMs: PASSWORD_RESET_RATE_LIMIT.windowMs,
  });

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many password reset attempts. Please try again later.",
      429,
      {
        resetAt: new Date(rateLimit.resetAt).toISOString(),
      }
    );
  }
  try {
    const body = await request.json();
    const input = passwordResetRequestSchema.parse(body);
    const result = await requestPasswordReset(input);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid password reset request payload",
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
          code: "PASSWORD_RESET_REQUEST_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Password reset request failed",
        },
      },
      { status: 400 }
    );
  }
}
