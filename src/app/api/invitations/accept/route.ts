import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { acceptInvitationSchema } from "@/services/invitation-schemas";
import { acceptInvitation } from "@/services/invitation-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = acceptInvitationSchema.parse(body);
    const result = await acceptInvitation(input);

    return NextResponse.json(
      {
        success: true,
        data: result,
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
            message: "Invalid invitation acceptance payload",
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
          code: "INVITATION_ACCEPT_FAILED",
          message:
            error instanceof Error ? error.message : "Invitation acceptance failed",
        },
      },
      { status: 400 }
    );
  }
}
