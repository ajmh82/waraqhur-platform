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
  context: { params: Promise<{ commentId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { commentId } = await context.params;
    const userId = auth.current.user.id;

    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    });

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMMENT_NOT_FOUND",
            message: "Comment not found",
          },
        },
        { status: 404 }
      );
    }

    await prisma.commentLike.upsert({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
      update: {},
      create: {
        userId,
        commentId,
      },
    });

    const likesCount = await prisma.commentLike.count({
      where: {
        commentId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        liked: true,
        likesCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_LIKE_FAILED",
          message: error instanceof Error ? error.message : "Comment like failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { commentId } = await context.params;
    const userId = auth.current.user.id;

    await prisma.commentLike.deleteMany({
      where: {
        userId,
        commentId,
      },
    });

    const likesCount = await prisma.commentLike.count({
      where: {
        commentId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        liked: false,
        likesCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_UNLIKE_FAILED",
          message: error instanceof Error ? error.message : "Comment unlike failed",
        },
      },
      { status: 400 }
    );
  }
}
