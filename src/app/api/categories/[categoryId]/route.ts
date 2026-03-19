import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { updateCategorySchema } from "@/services/content-schemas";
import { deleteCategory, updateCategory } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string }> }
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
    const canManageCategories = await userHasPermission(
      current.user.id,
      "categories.manage"
    );

    if (!canManageCategories) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage categories",
          },
        },
        { status: 403 }
      );
    }

    const { categoryId } = await context.params;
    const body = await request.json();
    const input = updateCategorySchema.parse(body);
    const category = await updateCategory(categoryId, input);

    return NextResponse.json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid category update payload",
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
          code: "CATEGORY_UPDATE_FAILED",
          message:
            error instanceof Error ? error.message : "Category update failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ categoryId: string }> }
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
    const canManageCategories = await userHasPermission(
      current.user.id,
      "categories.manage"
    );

    if (!canManageCategories) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage categories",
          },
        },
        { status: 403 }
      );
    }

    const { categoryId } = await context.params;
    const category = await deleteCategory(categoryId);

    return NextResponse.json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATEGORY_DELETE_FAILED",
          message:
            error instanceof Error ? error.message : "Category delete failed",
        },
      },
      { status: 400 }
    );
  }
}
