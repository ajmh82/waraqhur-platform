import { ZodError } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { buildRateLimitKey, checkRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/services/auth-schemas";
import { registerUser } from "@/services/auth-service";
import { sendEmailVerification } from "@/services/auth-recovery-service";

const REGISTER_RATE_LIMIT = {
  limit: 5,
  windowMs: 60_000,
};

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

    let verificationDispatched = false;
    try {
      const verificationResult = await sendEmailVerification({ email: user.email });
      verificationDispatched = Boolean(verificationResult?.dispatched);
    } catch {
      verificationDispatched = false;
    }

    return apiSuccess(
      {
        user,
        verificationDispatched,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "Invalid registration payload",
        400,
        error.flatten()
      );
    }

    return apiError(
      "REGISTER_FAILED",
      error instanceof Error ? error.message : "Registration failed",
      400
    );
  }
}
