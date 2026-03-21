import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { buildRateLimitKey, checkRateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/services/auth-recovery-service";
import { passwordResetRequestSchema } from "@/services/auth-recovery-schemas";

const PASSWORD_RESET_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000,
};

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

    return apiSuccess(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid password reset request payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "PASSWORD_RESET_REQUEST_FAILED",
      error instanceof Error
        ? error.message
        : "Password reset request failed",
      400
    );
  }
}
