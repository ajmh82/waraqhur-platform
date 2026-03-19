import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { emailVerificationRequestSchema } from "@/services/auth-recovery-schemas";
import { sendEmailVerification } from "@/services/auth-recovery-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = emailVerificationRequestSchema.parse(body);
    const result = await sendEmailVerification(input);

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
            message: "Invalid email verification request payload",
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
          code: "EMAIL_VERIFICATION_REQUEST_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Email verification request failed",
        },
      },
      { status: 400 }
    );
  }
}
