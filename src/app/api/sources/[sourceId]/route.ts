import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { updateSourceSchema } from "@/services/content-schemas";
import { deleteSource, updateSource } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sourceId: string }> }
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
    const canManageSources = await userHasPermission(
      current.user.id,
      "sources.manage"
    );

    if (!canManageSources) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage sources",
          },
        },
        { status: 403 }
      );
    }

    const { sourceId } = await context.params;
    const body = await request.json();
    const input = updateSourceSchema.parse(body);
    const source = await updateSource(sourceId, input);

    return NextResponse.json({
      success: true,
      data: {
        source,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid source update payload",
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
          code: "SOURCE_UPDATE_FAILED",
          message:
            error instanceof Error ? error.message : "Source update failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sourceId: string }> }
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
    const canManageSources = await userHasPermission(
      current.user.id,
      "sources.manage"
    );

    if (!canManageSources) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage sources",
          },
        },
        { status: 403 }
      );
    }

    const { sourceId } = await context.params;
    const source = await deleteSource(sourceId);

    return NextResponse.json({
      success: true,
      data: {
        source,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SOURCE_DELETE_FAILED",
          message:
            error instanceof Error ? error.message : "Source delete failed",
        },
      },
      { status: 400 }
    );
  }
}
