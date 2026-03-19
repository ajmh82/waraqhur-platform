import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { revokeInvitationSchema } from "@/services/invitation-schemas";
import { revokeInvitation } from "@/services/invitation-service";
import { userHasPermission } from "@/services/authorization-service";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canRevokeInvites = await userHasPermission(
      current.user.id,
      "invites.revoke"
    );

    if (!canRevokeInvites) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to revoke invitations",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = revokeInvitationSchema.parse(body);

    const invitation = await revokeInvitation({
      invitationId: input.invitationId,
      revokedByUserId: current.user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        invitation,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid invitation revoke payload",
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
          code: "INVITATION_REVOKE_FAILED",
          message:
            error instanceof Error ? error.message : "Invitation revoke failed",
        },
      },
      { status: 400 }
    );
  }
}
