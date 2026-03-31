import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";
import { createInAppNotification } from "@/services/notification-service";

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
  context: { params: Promise<{ postId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { postId } = await context.params;
    const userId = auth.current.user.id;
    const actorUsername = auth.current.user.username;

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "POST_NOT_FOUND",
            message: "Post not found",
          },
        },
        { status: 404 }
      );
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      select: { userId: true },
    });

    await prisma.bookmark.upsert({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
      update: {},
      create: {
        userId,
        postId,
      },
    });

    if (!existingBookmark && post.authorUserId && post.authorUserId !== userId) {
      const actionUrl = post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`;
      await createInAppNotification({
        userId: post.authorUserId,
        title: "حفظ جديد",
        body: `@${actorUsername} حفظ تغريدتك`,
        payload: {
          event: "post.bookmarked",
          actionUrl,
          entityType: "post",
          entityId: post.id,
          metadata: {
            postId: post.id,
            postSlug: post.slug ?? null,
            actorUserId: userId,
            actorUsername,
          },
        },
      });
    }

    const bookmarksCount = await prisma.bookmark.count({
      where: {
        postId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        bookmarked: true,
        isBookmarked: true,
        bookmarksCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BOOKMARK_FAILED",
          message: error instanceof Error ? error.message : "Bookmark failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { postId } = await context.params;
    const userId = auth.current.user.id;

    await prisma.bookmark.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    const bookmarksCount = await prisma.bookmark.count({
      where: {
        postId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        bookmarked: false,
        isBookmarked: false,
        bookmarksCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNBOOKMARK_FAILED",
          message: error instanceof Error ? error.message : "Unbookmark failed",
        },
      },
      { status: 400 }
    );
  }
}
