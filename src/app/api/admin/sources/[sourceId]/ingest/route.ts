import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { ingestSourceById } from "@/services/source-ingest-service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sourceId: string }> }
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
    await getCurrentUserFromSession(sessionValue);
    const { sourceId } = await params;

    const result = await ingestSourceById(sourceId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    const code =
      message === "SOURCE_NOT_FOUND"
        ? "SOURCE_NOT_FOUND"
        : message === "NITTER_INGEST_SHOULD_USE_WORKER"
          ? "NITTER_INGEST_SHOULD_USE_WORKER"
          : message === "SOURCE_TYPE_NOT_SUPPORTED"
            ? "SOURCE_TYPE_NOT_SUPPORTED"
            : "INGEST_FAILED";

    const status =
      code === "SOURCE_NOT_FOUND" ? 404 :
      code === "NITTER_INGEST_SHOULD_USE_WORKER" ? 400 :
      code === "SOURCE_TYPE_NOT_SUPPORTED" ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      { status }
    );
  }
}
