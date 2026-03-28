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

export async function GET() {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const userId = auth.current.user.id;

    const rows = await prisma.userBlock.findMany({
      where: { blockerUserId: userId },
      include: {
        blocked: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        blockedUsers: rows.map((row) => ({
          userId: row.blocked.id,
          username: row.blocked.username,
          displayName: row.blocked.profile?.displayName ?? row.blocked.username,
          avatarUrl: row.blocked.profile?.avatarUrl ?? null,
          blockedAt: row.createdAt.toISOString(),
        })),
        total: rows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_BLOCKS_FAILED",
          message: error instanceof Error ? error.message : "Failed to load blocked users",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const blockerUserId = auth.current.user.id;
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const blockedUserId =
      typeof body.blockedUserId === "string" ? body.blockedUserId.trim() : "";

    if (!blockedUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BLOCKED_USER_REQUIRED", message: "blockedUserId is required" },
        },
        { status: 400 }
      );
    }

    if (blockedUserId === blockerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SELF_BLOCK_NOT_ALLOWED", message: "Cannot block yourself" },
        },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "Target user not found" },
        },
        { status: 404 }
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.userBlock.upsert({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId,
            blockedUserId,
          },
        },
        update: {},
        create: {
          blockerUserId,
          blockedUserId,
        },
      });

      await tx.directMessageRequest.updateMany({
        where: {
          status: "PENDING",
          OR: [
            { requesterUserId: blockerUserId, targetUserId: blockedUserId },
            { requesterUserId: blockedUserId, targetUserId: blockerUserId },
          ],
        },
        data: {
          status: "CANCELED",
          respondedAt: now,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        blockedUserId,
        blocked: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BLOCK_USER_FAILED",
          message: error instanceof Error ? error.message : "Failed to block user",
        },
      },
      { status: 400 }
    );
  }
}
