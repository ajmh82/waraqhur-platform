import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createCommentSchema } from "@/services/content-schemas";
import { createComment, listComments } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId") ?? undefined;
    const comments = await listComments(postId);

    return NextResponse.json({
      success: true,
      data: {
        comments,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COMMENT_LIST_FAILED",
          message:
            error instanceof Error ? error.message : "Comment list failed",
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
    const canReadComments = await userHasPermission(
      current.user.id,
      "comments.read"
    );

    if (!canReadComments) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create comments",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = createCommentSchema.parse(body);
    const comment = await createComment(input, current.user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          comment,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid comment payload",
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
          code: "COMMENT_CREATE_FAILED",
          message:
            error instanceof Error ? error.message : "Comment creation failed",
        },
      },
      { status: 400 }
    );
  }
}
