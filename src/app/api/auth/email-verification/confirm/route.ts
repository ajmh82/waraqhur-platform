import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { emailVerificationConfirmSchema } from "@/services/auth-recovery-schemas";
import { confirmEmailVerification } from "@/services/auth-recovery-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = emailVerificationConfirmSchema.parse(body);
    const result = await confirmEmailVerification(input.token);

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
            message: "Invalid email verification confirmation payload",
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
          code: "EMAIL_VERIFICATION_CONFIRM_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Email verification confirmation failed",
        },
      },
      { status: 400 }
    );
  }
}
