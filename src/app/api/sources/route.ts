import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createSourceSchema } from "@/services/content-schemas";
import { createSource, listSources } from "@/services/content-service";
import { userHasPermission } from "@/services/authorization-service";

export async function GET() {
  try {
    const sources = await listSources();

    return NextResponse.json({
      success: true,
      data: {
        sources,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SOURCE_LIST_FAILED",
          message: error instanceof Error ? error.message : "Source list failed",
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

    const body = await request.json();
    const input = createSourceSchema.parse(body);
    const source = await createSource(input);

    return NextResponse.json(
      {
        success: true,
        data: {
          source,
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
            message: "Invalid source payload",
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
          code: "SOURCE_CREATE_FAILED",
          message:
            error instanceof Error ? error.message : "Source creation failed",
        },
      },
      { status: 400 }
    );
  }
}
