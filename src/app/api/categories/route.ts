import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createCategorySchema } from "@/services/content-schemas";
import { createCategory, listCategories } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";

export async function GET() {
  try {
    const categories = await listCategories();

    return NextResponse.json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CATEGORY_LIST_FAILED",
          message:
            error instanceof Error ? error.message : "Category list failed",
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

    const body = await request.json();
    const input = createCategorySchema.parse(body);
    const category = await createCategory(input);

    return NextResponse.json(
      {
        success: true,
        data: {
          category,
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
            message: "Invalid category payload",
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
          code: "CATEGORY_CREATE_FAILED",
          message:
            error instanceof Error ? error.message : "Category creation failed",
        },
      },
      { status: 400 }
    );
  }
}
