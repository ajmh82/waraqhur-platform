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

async function getRepostsCount(postId: string) {
  return prisma.post.count({
    where: {
      repostOfPostId: postId,
      status: {
        not: "DELETED",
      },
    },
  });
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
    const currentUserId = auth.current.user.id;

    const originalPost = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    });

    if (!originalPost) {
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

    const existingRepost = await prisma.post.findFirst({
      where: {
        authorUserId: currentUserId,
        repostOfPostId: postId,
        status: {
          not: "DELETED",
        },
      },
    });

    if (!existingRepost) {
      await prisma.post.create({
        data: {
          title: originalPost.title,
          slug: null,
          content: null,
          excerpt: originalPost.excerpt,
          coverImageUrl: originalPost.coverImageUrl,
          categoryId: originalPost.categoryId,
          sourceId: originalPost.sourceId,
          repostOfPostId: originalPost.id,
          visibility: "PUBLIC",
          status: "PUBLISHED",
          authorUserId: currentUserId,
          updatedByUserId: currentUserId,
          publishedAt: new Date(),
        },
      });
    }

    const repostsCount = await getRepostsCount(postId);

    return NextResponse.json({
      success: true,
      data: {
        reposted: true,
        repostsCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REPOST_FAILED",
          message: error instanceof Error ? error.message : "Repost failed",
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
    const currentUserId = auth.current.user.id;

    await prisma.post.updateMany({
      where: {
        authorUserId: currentUserId,
        repostOfPostId: postId,
        status: {
          not: "DELETED",
        },
      },
      data: {
        status: "DELETED",
        updatedByUserId: currentUserId,
      },
    });

    const repostsCount = await getRepostsCount(postId);

    return NextResponse.json({
      success: true,
      data: {
        reposted: false,
        repostsCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNDO_REPOST_FAILED",
          message: error instanceof Error ? error.message : "Undo repost failed",
        },
      },
      { status: 400 }
    );
  }
}
