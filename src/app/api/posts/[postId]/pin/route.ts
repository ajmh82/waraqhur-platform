import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromSession } from "@/services/auth-service";

async function requireCurrentUserId() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return null;
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return current.user.id;
  } catch {
    return null;
  }
}

async function getPostForOwnership(postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorUserId: true,
      status: true,
    },
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const currentUserId = await requireCurrentUserId();

    if (!currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in",
          },
        },
        { status: 401 }
      );
    }

    const { postId } = await context.params;
    const post = await getPostForOwnership(postId);

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

    if (post.authorUserId !== currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can pin only your own posts",
          },
        },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        pinnedPostId: post.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pinnedPostId: post.id,
        pinned: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PIN_POST_FAILED",
          message: error instanceof Error ? error.message : "Failed to pin post",
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
  try {
    const currentUserId = await requireCurrentUserId();

    if (!currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in",
          },
        },
        { status: 401 }
      );
    }

    const { postId } = await context.params;
    const post = await getPostForOwnership(postId);

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

    if (post.authorUserId !== currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can unpin only your own posts",
          },
        },
        { status: 403 }
      );
    }

    const me = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { pinnedPostId: true },
    });

    if (me?.pinnedPostId !== post.id) {
      return NextResponse.json({
        success: true,
        data: {
          pinnedPostId: me?.pinnedPostId ?? null,
          pinned: false,
        },
      });
    }

    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        pinnedPostId: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pinnedPostId: null,
        pinned: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNPIN_POST_FAILED",
          message: error instanceof Error ? error.message : "Failed to unpin post",
        },
      },
      { status: 400 }
    );
  }
}
