import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { updatePostSchema } from "@/services/content-schemas";
import { deletePost, updatePost } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";
import { createAuditLog } from "@/services/audit-log-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canUpdatePosts = await userHasPermission(
      current.user.id,
      "posts.update"
    );

    if (!canUpdatePosts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to update posts",
          },
        },
        { status: 403 }
      );
    }

    const { postId } = await context.params;
    const body = await request.json();
    const input = updatePostSchema.parse(body);
    const post = await updatePost(postId, input, current.user.id);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "POST_UPDATED",
      targetType: "POST",
      targetId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        status: post.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid post update payload",
            details: error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "POST_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Post update failed",
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
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canDeletePosts = await userHasPermission(
      current.user.id,
      "posts.delete"
    );

    if (!canDeletePosts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete posts",
          },
        },
        { status: 403 }
      );
    }

    const { postId } = await context.params;
    const post = await deletePost(postId, current.user.id);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "POST_DELETED",
      targetType: "POST",
      targetId: post.id,
      metadata: {
        title: post.title,
        slug: post.slug,
        status: post.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        post,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "POST_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Post delete failed",
        },
      },
      { status: 400 }
    );
  }
}
