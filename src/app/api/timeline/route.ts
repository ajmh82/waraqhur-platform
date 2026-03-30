import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

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

export async function GET(request: Request) {
  try {
    const currentUserId = await getOptionalCurrentUserId();
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get("mode") === "sources" ? "sources" : "people";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "10")));
    const skip = (page - 1) * limit;

    const allPosts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      include: {
        category: true,
        source: true,
        author: {
          include: {
            profile: true,
            followers: currentUserId
              ? {
                  where: {
                    followerId: currentUserId,
                  },
                  select: {
                    followerId: true,
                  },
                }
              : false,
          },
        },
        comments: true,
        likes: true,
        reposts: true,
        bookmarks: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const filteredPosts = allPosts.filter((post) => {
      const social = getSocialMetadata(post.metadata);
      const hasSource = Boolean(post.sourceId);

      const isTweetByMetadata = social?.postKind === "tweet";
      const isTweetBySlug = typeof post.slug === "string" && post.slug.startsWith("tweet-");
      const isTweet = isTweetByMetadata || isTweetBySlug;

      if (mode === "people") {
        return isTweet || !hasSource;
      }

      return hasSource && !isTweet;
    });

    const total = filteredPosts.length;
    const posts = filteredPosts.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        posts: posts.map((post) => {
          const social = getSocialMetadata(post.metadata);

          return {
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            coverImageUrl: post.coverImageUrl,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            commentsCount: post.comments.length,
            likesCount: post.likes.length,
            repostsCount: post.reposts.length,
            bookmarksCount: post.bookmarks.length,
            viewsCount:
              post.comments.length +
              post.likes.length +
              post.reposts.length +
              post.bookmarks.length +
              1,
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
                  displayName:
                    post.author.profile?.displayName ?? post.author.username,
                  avatarUrl: post.author.profile?.avatarUrl ?? null,
                  isFollowing: currentUserId
                    ? Array.isArray(post.author.followers) &&
                      post.author.followers.length > 0
                    : false,
                  isOwnProfile: currentUserId
                    ? post.author.id === currentUserId
                    : false,
                }
              : null,
            metadata: {
              social: social
                ? {
                    postKind: social.postKind ?? null,
                    hashtags: social.hashtags ?? [],
                    mediaType: social.mediaType ?? null,
                    mediaUrl: social.mediaUrl ?? null,
                  }
                : undefined,
            },
          };
        }),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + posts.length < total,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "TIMELINE_LOAD_FAILED",
          message:
            error instanceof Error ? error.message : "Timeline load failed",
        },
      },
      { status: 400 }
    );
  }
}
