import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasPermission } from "@/services/authorization-service";

const MAX_TWEET_LENGTH = 280;

function extractHashtags(content: string) {
  const matches = content.match(/#([A-Za-z0-9_\u0600-\u06FF]+)/g) ?? [];
  return Array.from(
    new Set(
      matches.map((match) => match.slice(1).toLowerCase())
    )
  );
}

function getSocialMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = metadata as {
    social?: {
      postKind?: string;
      hashtags?: string[];
      mediaType?: "image" | "video" | null;
      mediaUrl?: string | null;
    };
  };

  return value.social ?? null;
}

async function getOptionalCurrentUserId() {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionValue) {
      return null;
    }

    const current = await getCurrentUserFromSession(sessionValue);
    return current.user.id;
  } catch {
    return null;
  }
}

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return {
      ok: true as const,
      current,
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "Invalid or expired session",
          },
        },
        { status: 401 }
      ),
    };
  }
}

export async function GET(request: Request) {
  try {
    const currentUserId = await getOptionalCurrentUserId();
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag")?.trim().toLowerCase() ?? "";

    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      include: {
        category: true,
        source: true,
        author: true,
        comments: true,
        likes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 80,
    });

    const filteredPosts = posts.filter((post) => {
      const social = getSocialMetadata(post.metadata);

      if (social?.postKind !== "tweet") {
        return false;
      }

      if (!tag) {
        return true;
      }

      return Boolean(social.hashtags?.includes(tag));
    });

    return NextResponse.json({
      success: true,
      data: {
        posts: filteredPosts.map((post) => {
          const social = getSocialMetadata(post.metadata);

          return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            commentsCount: post.comments.length,
            likesCount: post.likes.length,
            category: post.category
              ? {
                  id: post.category.id,
                  name: post.category.name,
                  slug: post.category.slug,
                }
              : null,
            source: post.source
              ? {
                  id: post.source.id,
                  name: post.source.name,
                  slug: post.source.slug,
                }
              : null,
            author: post.author
              ? {
                  id: post.author.id,
                  email: post.author.email,
                  username: post.author.username,
                }
              : null,
            metadata: {
              social: {
                postKind: "tweet",
                hashtags: social?.hashtags ?? [],
                mediaType: social?.mediaType ?? null,
                mediaUrl: social?.mediaUrl ?? null,
              },
            },
            isLikedByCurrentUser: false,
            currentUserId,
          };
        }),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TWEET_LIST_FAILED",
          message: error instanceof Error ? error.message : "Tweet list failed",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const canCreatePosts = await userHasPermission(
      auth.current.user.id,
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
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const mediaUrl =
      typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
    const mediaType =
      body.mediaType === "image" || body.mediaType === "video"
        ? body.mediaType
        : null;

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_REQUIRED",
            message: "Tweet content is required",
          },
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
            message: `Tweet content must not exceed ${MAX_TWEET_LENGTH} characters`,
          },
        },
        { status: 400 }
      );
    }

    const hashtags = extractHashtags(content);
    const slug = `tweet-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const post = await prisma.post.create({
      data: {
        title: content.slice(0, 80),
        slug,
        excerpt: content.slice(0, MAX_TWEET_LENGTH),
        content,
        coverImageUrl: mediaType === "image" ? mediaUrl || null : null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        publishedAt: new Date(),
        authorUserId: auth.current.user.id,
        updatedByUserId: auth.current.user.id,
        metadata: {
          social: {
            postKind: "tweet",
            hashtags,
            mediaType,
            mediaUrl: mediaUrl || null,
          },
        },
      },
      include: {
        category: true,
        source: true,
        author: true,
        comments: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          post: {
            id: post.id,
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            content: post.content,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TWEET_CREATE_FAILED",
          message: error instanceof Error ? error.message : "Tweet creation failed",
        },
      },
      { status: 400 }
    );
  }
}
