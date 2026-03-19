import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createInvitationSchema } from "@/services/invitation-schemas";
import { apiError } from "@/lib/api-response";
import { buildRateLimitKey, checkRateLimit } from "@/lib/rate-limit";

const INVITE_CREATE_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
};
import { createInvitation, listInvitations } from "@/services/invitation-service";
import { userHasPermission } from "@/services/authorization-service";
import { createAuditLog } from "@/services/audit-log-service";

export async function GET() {
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
    const canReadInvites = await userHasPermission(current.user.id, "invites.read");

    if (!canReadInvites) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to view invitations",
          },
        },
        { status: 403 }
      );
    }

    const invitations = await listInvitations();

    return NextResponse.json({
      success: true,
      data: {
        invitations,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SESSION",
          message: "Invalid or expired session",
        },
      },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
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

    const rateLimit = checkRateLimit({
      key: buildRateLimitKey(["invite-create", current.user.id, forwardedFor]),
      limit: INVITE_CREATE_RATE_LIMIT.limit,
      windowMs: INVITE_CREATE_RATE_LIMIT.windowMs,
    });

    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMITED",
        "Too many invitation creation attempts. Please try again later.",
        429,
        {
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        }
      );
    }

    const canCreateInvites = await userHasPermission(
      current.user.id,
      "invites.create"
    );

    if (!canCreateInvites) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create invitations",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = createInvitationSchema.parse(body);

    const invitation = await createInvitation({
      issuerUserId: current.user.id,
      email: input.email,
      roleKey: input.roleKey,
      expiresInDays: input.expiresInDays,
    });


    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "INVITATION_CREATED",
      targetType: "INVITE",
      targetId: invitation.id,
      metadata: {
        email: invitation.email,
        status: invitation.status,
        role: invitation.role,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          invitation,
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
            message: "Invalid invitation payload",
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
          code: "INVITATION_CREATE_FAILED",
          message:
            error instanceof Error ? error.message : "Invitation creation failed",
        },
      },
      { status: 400 }
    );
  }
}
