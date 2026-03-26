import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createPostSchema } from "@/services/content-schemas";
import { createPost } from "@/services/content-service";
import { listHomeTimeline, type TimelineSortMode } from "@/services/timeline-service";
import { userHasPermission } from "@/services/authorization-service";

async function getOptionalCurrentUserId() {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionValue) return null;

    const current = await getCurrentUserFromSession(sessionValue);
    return current.user.id;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const currentUserId = await getOptionalCurrentUserId();
    const { searchParams } = new URL(request.url);

    const rawSort = searchParams.get("sort");
    const sortMode: TimelineSortMode = rawSort === "smart" ? "smart" : "latest";

    const rawPage = Number(searchParams.get("page") ?? "1");
    const rawLimit = Number(searchParams.get("limit") ?? "10");

    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, 20)
        : 10;

    const allPosts = await listHomeTimeline(currentUserId, sortMode);

    const total = allPosts.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const posts = allPosts.slice(start, end);
    const hasMore = end < total;

    return NextResponse.json({
      success: true,
      data: {
        posts,
        sortMode,
        pagination: {
          page,
          limit,
          total,
          hasMore,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "POST_LIST_FAILED",
          message: error instanceof Error ? error.message : "Post list failed",
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
    const canCreatePosts = await userHasPermission(
      current.user.id,
      "posts.create"
    );

    if (!canCreatePosts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create posts",
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = createPostSchema.parse(body);
    const post = await createPost(input, current.user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          post,
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
            message: "Invalid post payload",
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
          code: "POST_CREATE_FAILED",
          message: error instanceof Error ? error.message : "Post creation failed",
        },
      },
      { status: 400 }
    );
  }
}
