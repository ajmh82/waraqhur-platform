import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasPermission } from "@/services/authorization-service";
import { fetchNitterTimeline } from "@/services/ingestion/nitter-ingestion-service";

export async function GET(
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
            message: "You do not have permission to preview sources",
          },
        },
        { status: 403 }
      );
    }

    const { sourceId } = await context.params;

    const source = await prisma.source.findUnique({
      where: {
        id: sourceId,
      },
    });

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SOURCE_NOT_FOUND",
            message: "Source not found",
          },
        },
        { status: 404 }
      );
    }

    if (source.type !== "NITTER") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SOURCE_TYPE_NOT_SUPPORTED",
            message: "Preview is currently supported for NITTER only",
          },
        },
        { status: 400 }
      );
    }

    if (!source.url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SOURCE_URL_MISSING",
            message: "Source URL is missing",
          },
        },
        { status: 400 }
      );
    }

    const preview = await fetchNitterTimeline(source.url);

    return NextResponse.json({
      success: true,
      data: {
        source: {
          id: source.id,
          name: source.name,
          type: source.type,
          url: source.url,
        },
        preview,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SOURCE_PREVIEW_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to preview source",
        },
      },
      { status: 400 }
    );
  }
}
