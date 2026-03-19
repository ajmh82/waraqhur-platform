import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { updateCommentSchema } from "@/services/content-schemas";
import { deleteComment, updateComment } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";
import { createAuditLog } from "@/services/audit-log-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ commentId: string }> }
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
    const canModerateComments = await userHasPermission(
      current.user.id,
      "comments.moderate"
    );

    if (!canModerateComments) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to update comments",
          },
        },
        { status: 403 }
      );
    }

    const { commentId } = await context.params;
    const body = await request.json();
    const input = updateCommentSchema.parse(body);
    const comment = await updateComment(commentId, input);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "COMMENT_UPDATED",
      targetType: "COMMENT",
      targetId: comment.id,
      metadata: {
        postId: comment.postId,
        status: comment.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        comment,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid comment update payload",
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
          code: "COMMENT_UPDATE_FAILED",
          message:
            error instanceof Error ? error.message : "Comment update failed",
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
    const canModerateComments = await userHasPermission(
      current.user.id,
      "comments.moderate"
    );

    if (!canModerateComments) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to delete comments",
          },
        },
        { status: 403 }
      );
    }

    const { commentId } = await context.params;
    const comment = await deleteComment(commentId);

    await createAuditLog({
      actorUserId: current.user.id,
      actorType: "USER",
      action: "COMMENT_DELETED",
      targetType: "COMMENT",
      targetId: comment.id,
      metadata: {
        postId: comment.postId,
        status: comment.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        comment,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_DELETE_FAILED",
          message:
            error instanceof Error ? error.message : "Comment delete failed",
        },
      },
      { status: 400 }
    );
  }
}
