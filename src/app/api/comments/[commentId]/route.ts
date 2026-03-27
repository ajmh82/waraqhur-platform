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

async function collectDescendantCommentIds(rootId: string): Promise<string[]> {
  const allIds: string[] = [rootId];
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const children = await prisma.comment.findMany({
      where: { parentCommentId: parentId },
      select: { id: true },
    });

    for (const child of children) {
      allIds.push(child.id);
      queue.push(child.id);
    }
  }

  return allIds;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const { commentId } = await context.params;
  const currentUserId = auth.current.user.id;

  const target = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorUserId: true },
  });

  if (!target) {
    return NextResponse.json(
      { success: false, error: { code: "COMMENT_NOT_FOUND", message: "Comment not found" } },
      { status: 404 }
    );
  }

  if (target.authorUserId !== currentUserId) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "You can only delete your own comment" } },
      { status: 403 }
    );
  }

  const ids = await collectDescendantCommentIds(commentId);

  await prisma.$transaction([
    prisma.commentLike.deleteMany({ where: { commentId: { in: ids } } }),
    prisma.comment.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      deleted: true,
      deletedCount: ids.length,
    },
  });
}
