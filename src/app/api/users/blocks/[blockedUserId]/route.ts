import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return { ok: true as const, current };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_SESSION", message: "Invalid or expired session" },
        },
        { status: 401 }
      ),
    };
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ blockedUserId: string }> }
) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const blockerUserId = auth.current.user.id;
    const { blockedUserId } = await context.params;

    if (!blockedUserId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BLOCKED_USER_REQUIRED", message: "blockedUserId is required" },
        },
        { status: 400 }
      );
    }

    await prisma.userBlock.deleteMany({
      where: {
        blockerUserId,
        blockedUserId: blockedUserId.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        blockedUserId: blockedUserId.trim(),
        blocked: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNBLOCK_USER_FAILED",
          message: error instanceof Error ? error.message : "Failed to unblock user",
        },
      },
      { status: 400 }
    );
  }
}
