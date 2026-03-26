import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createCommentSchema } from "@/services/content-schemas";
import { createComment } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get("postId");

    const where: Record<string, unknown> = { status: "ACTIVE" };
    if (postId) {
      where.postId = postId;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const mapped = comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      content: c.content,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: c.author
        ? { id: c.author.id, email: c.author.email, username: c.author.username }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: { comments: mapped },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_LIST_FAILED",
          message: error instanceof Error ? error.message : "Comment list failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canCreate =
      (await userHasPermission(current.user.id, "comments.create")) ||
      (await userHasPermission(current.user.id, "comments.manage")) ||
      (await userHasPermission(current.user.id, "posts.update"));

    if (!canCreate) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to create comments" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = createCommentSchema.parse(body);
    const comment = await createComment(input, current.user.id);

    return NextResponse.json({ success: true, data: { comment } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid comment payload", details: error.flatten() } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "COMMENT_CREATE_FAILED", message: error instanceof Error ? error.message : "Comment creation failed" } },
      { status: 400 }
    );
  }
}
