import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

const MAX_TWEET_LENGTH = 280;

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return { ok: true as const, current };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_SESSION", message: "Invalid or expired session" },
        },
        { status: 401 }
      ),
    };
  }
}

function extractHashtags(content: string) {
  const matches = content.match(/#([A-Za-z0-9_\u0600-\u06FF]+)/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.slice(1).toLowerCase())));
}

function getMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  return metadata as Record<string, unknown>;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const { postId } = await context.params;
    const body = await request.json();

    const content = typeof body.content === "string" ? body.content.trim() : "";
    const mediaUrl =
      typeof body.mediaUrl === "string" && body.mediaUrl.trim()
        ? body.mediaUrl.trim()
        : null;
    const mediaType =
      body.mediaType === "image" || body.mediaType === "video"
        ? body.mediaType
        : null;
    const removeMedia = Boolean(body.removeMedia);

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONTENT_REQUIRED", message: "Content is required" },
        },
        { status: 400 }
      );
    }

    if (content.length > MAX_TWEET_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_TOO_LONG",
            message: `Content must not exceed ${MAX_TWEET_LENGTH} characters`,
          },
        },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "POST_NOT_FOUND", message: "Post not found" },
        },
        { status: 404 }
      );
    }

    if (post.authorUserId !== auth.current.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "You can only edit your own post" },
        },
        { status: 403 }
      );
    }

    const currentMetadata = getMetadata(post.metadata);
    const social = (currentMetadata.social ?? {}) as Record<string, unknown>;

    const nextMediaUrl = removeMedia
      ? null
      : mediaUrl ?? (typeof social.mediaUrl === "string" ? social.mediaUrl : null);

    const nextMediaType = removeMedia
      ? null
      : mediaType ?? (social.mediaType === "image" || social.mediaType === "video"
          ? social.mediaType
          : null);

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title: content.slice(0, 80),
        content,
        excerpt: content.slice(0, MAX_TWEET_LENGTH),
        coverImageUrl: nextMediaType === "image" ? nextMediaUrl : null,
        updatedByUserId: auth.current.user.id,
        metadata: {
          ...currentMetadata,
          social: {
            ...social,
            hashtags: extractHashtags(content),
            mediaType: nextMediaType,
            mediaUrl: nextMediaUrl,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        post: {
          id: updatedPost.id,
          slug: updatedPost.slug,
          title: updatedPost.title,
          content: updatedPost.content,
          excerpt: updatedPost.excerpt,
          updatedAt: updatedPost.updatedAt.toISOString(),
          mediaType: nextMediaType,
          mediaUrl: nextMediaUrl,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "OWNER_POST_UPDATE_FAILED",
          message: error instanceof Error ? error.message : "Failed to update post",
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
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const { postId } = await context.params;

    const post = await prisma.post.findUnique({ where: { id: postId } });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "POST_NOT_FOUND", message: "Post not found" },
        },
        { status: 404 }
      );
    }

    if (post.authorUserId !== auth.current.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "You can only delete your own post" },
        },
        { status: 403 }
      );
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "DELETED",
        updatedByUserId: auth.current.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "OWNER_POST_DELETE_FAILED",
          message: error instanceof Error ? error.message : "Failed to delete post",
        },
      },
      { status: 400 }
    );
  }
}
