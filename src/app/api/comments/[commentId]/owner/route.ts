import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

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

async function collectDescendantIds(rootId: string): Promise<string[]> {
  const allComments = await prisma.comment.findMany({
    select: {
      id: true,
      parentId: true,
    },
  });

  const childrenMap = new Map<string, string[]>();

  for (const comment of allComments) {
    if (!comment.parentId) continue;
    const current = childrenMap.get(comment.parentId) ?? [];
    current.push(comment.id);
    childrenMap.set(comment.parentId, current);
  }

  const collected: string[] = [];
  const stack = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    collected.push(currentId);

    const children = childrenMap.get(currentId) ?? [];
    for (const childId of children) {
      stack.push(childId);
    }
  }

  return collected;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const { commentId } = await context.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "COMMENT_NOT_FOUND", message: "Comment not found" },
        },
        { status: 404 }
      );
    }

    if (comment.authorUserId !== auth.current.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "You can only delete your own comment" },
        },
        { status: 403 }
      );
    }

    const idsToDelete = await collectDescendantIds(commentId);

    await prisma.$transaction([
      prisma.commentLike.deleteMany({
        where: {
          commentId: {
            in: idsToDelete,
          },
        },
      }),
      prisma.comment.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        deletedCount: idsToDelete.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Failed to delete comment",
        },
      },
      { status: 400 }
    );
  }
}
