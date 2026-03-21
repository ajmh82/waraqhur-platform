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
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return {
      ok: true as const,
      current,
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "Invalid or expired session",
          },
        },
        { status: 401 }
      ),
    };
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { userId } = await context.params;
    const followerId = auth.current.user.id;

    if (followerId === userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SELF_FOLLOW_NOT_ALLOWED",
            message: "You cannot follow yourself",
          },
        },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Target user not found",
          },
        },
        { status: 404 }
      );
    }

    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId,
        },
      },
      update: {},
      create: {
        followerId,
        followingId: userId,
      },
    });

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: {
          followingId: userId,
        },
      }),
      prisma.follow.count({
        where: {
          followerId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        following: true,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FOLLOW_FAILED",
          message: error instanceof Error ? error.message : "Follow failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { userId } = await context.params;
    const followerId = auth.current.user.id;

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: userId,
      },
    });

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: {
          followingId: userId,
        },
      }),
      prisma.follow.count({
        where: {
          followerId,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        following: false,
        followersCount,
        followingCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNFOLLOW_FAILED",
          message: error instanceof Error ? error.message : "Unfollow failed",
        },
      },
      { status: 400 }
    );
  }
}
