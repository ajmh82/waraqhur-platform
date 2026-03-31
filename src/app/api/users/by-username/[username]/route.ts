import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const currentUserId = await getOptionalCurrentUserId();

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        userRoles: {
          include: { role: true },
          orderBy: { assignedAt: "asc" },
        },
        authoredPosts: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            category: true,
            source: true,
            author: {
              include: {
                profile: true,
              },
            },
            comments: true,
            likes: true,
            reposts: true,
            bookmarks: true,
            repostOfPost: {
              include: {
                category: true,
                source: true,
                author: {
                  include: {
                    profile: true,
                  },
                },
                comments: true,
                likes: true,
                reposts: true,
                bookmarks: true,
              },
            },
          },
        },
        followers: true,
        following: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    const isOwnProfile = currentUserId === user.id;

    const hasBlockRelation =
      currentUserId && !isOwnProfile
        ? Boolean(
            await prisma.userBlock.findFirst({
              where: {
                OR: [
                  { blockerUserId: currentUserId, blockedUserId: user.id },
                  { blockerUserId: user.id, blockedUserId: currentUserId },
                ],
              },
              select: { blockerUserId: true },
            })
          )
        : false;

    if (hasBlockRelation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROFILE_BLOCKED",
            message: "This profile is unavailable",
          },
        },
        { status: 403 }
      );
    }

    const isFollowing =
      currentUserId && !isOwnProfile
        ? Boolean(
            await prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: user.id,
                },
              },
            })
          )
        : false;

    const isPrivateAccount = Boolean(user.profile?.isPrivateAccount);
    const canViewContent = !isPrivateAccount || isOwnProfile || isFollowing;

    const followVisibilityPrivate = Boolean(user.profile?.followVisibilityPrivate);
    const canShowConnections = !followVisibilityPrivate || isOwnProfile;

    const safeFollowersCount = canShowConnections ? user.followers.length : 0;
    const safeFollowingCount = canShowConnections ? user.following.length : 0;

    const pinnedPost =
      canViewContent && user.pinnedPostId
        ? await prisma.post.findUnique({
            where: { id: user.pinnedPostId },
            include: {
              category: true,
              source: true,
              author: {
                include: {
                  profile: true,
                },
              },
              comments: true,
              likes: true,
              reposts: true,
              bookmarks: true,
            },
          })
        : null;

    const pinnedPostPayload = pinnedPost
      ? (() => {
          const pinnedSocial = getSocialMetadata(pinnedPost.metadata);
          return {
            id: pinnedPost.id,
            title: pinnedPost.title,
            slug: pinnedPost.slug,
            excerpt: pinnedPost.excerpt,
            content: pinnedPost.content,
            coverImageUrl: pinnedPost.coverImageUrl,
            createdAt: pinnedPost.createdAt.toISOString(),
            updatedAt: pinnedPost.updatedAt.toISOString(),
            commentsCount: pinnedPost.comments.length,
            likesCount: pinnedPost.likes.length,
            repostsCount: pinnedPost.reposts.length,
            bookmarksCount: pinnedPost.bookmarks.length,
            viewsCount:
              pinnedPost.comments.length +
              pinnedPost.likes.length +
              pinnedPost.reposts.length +
              pinnedPost.bookmarks.length +
              1,
            category: pinnedPost.category
              ? {
                  id: pinnedPost.category.id,
                  name: pinnedPost.category.name,
                  slug: pinnedPost.category.slug,
                }
              : null,
            source: pinnedPost.source
              ? {
                  id: pinnedPost.source.id,
                  name: pinnedPost.source.name,
                  slug: pinnedPost.source.slug,
                }
              : null,
            author: pinnedPost.author
              ? {
                  id: pinnedPost.author.id,
                  email: pinnedPost.author.email,
                  username: pinnedPost.author.username,
                  displayName:
                    pinnedPost.author.profile?.displayName ??
                    pinnedPost.author.username,
                  avatarUrl: pinnedPost.author.profile?.avatarUrl ?? null,
                  isFollowing,
                  isOwnProfile,
                }
              : null,
            metadata: {
              social: pinnedSocial
                ? {
                    postKind: pinnedSocial.postKind ?? null,
                    hashtags: pinnedSocial.hashtags ?? [],
                    mediaType: pinnedSocial.mediaType ?? null,
                    mediaUrl: pinnedSocial.mediaUrl ?? null,
                  }
                : undefined,
            },
            isPinned: true,
          };
        })()
      : null;

    const mappedPosts = canViewContent
      ? user.authoredPosts
          .filter((post) => !post.repostOfPostId)
          .map((post) => {
          const social = getSocialMetadata(post.metadata);
          const repostSocial = getSocialMetadata(post.repostOfPost?.metadata);

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
                  isFollowing,
                  isOwnProfile,
                }
              : null,
            repostOfPost:
              post.repostOfPost && post.repostOfPost.status === "PUBLISHED"
                ? {
                    id: post.repostOfPost.id,
                    title: post.repostOfPost.title,
                    slug: post.repostOfPost.slug,
                    excerpt: post.repostOfPost.excerpt,
                    content: post.repostOfPost.content,
                    coverImageUrl: post.repostOfPost.coverImageUrl,
                    createdAt: post.repostOfPost.createdAt.toISOString(),
                    updatedAt: post.repostOfPost.updatedAt.toISOString(),
                    commentsCount: post.repostOfPost.comments.length,
                    likesCount: post.repostOfPost.likes.length,
                    repostsCount: post.repostOfPost.reposts.length,
                    bookmarksCount: post.repostOfPost.bookmarks.length,
                    viewsCount:
                      post.repostOfPost.comments.length +
                      post.repostOfPost.likes.length +
                      post.repostOfPost.reposts.length +
                      post.repostOfPost.bookmarks.length +
                      1,
                    category: post.repostOfPost.category
                      ? {
                          id: post.repostOfPost.category.id,
                          name: post.repostOfPost.category.name,
                          slug: post.repostOfPost.category.slug,
                        }
                      : null,
                    source: post.repostOfPost.source
                      ? {
                          id: post.repostOfPost.source.id,
                          name: post.repostOfPost.source.name,
                          slug: post.repostOfPost.source.slug,
                        }
                      : null,
                    author: post.repostOfPost.author
                      ? {
                          id: post.repostOfPost.author.id,
                          email: post.repostOfPost.author.email,
                          username: post.repostOfPost.author.username,
                          displayName:
                            post.repostOfPost.author.profile?.displayName ??
                            post.repostOfPost.author.username,
                          avatarUrl:
                            post.repostOfPost.author.profile?.avatarUrl ?? null,
                        }
                      : null,
                    metadata: {
                      social: repostSocial
                        ? {
                            postKind: repostSocial.postKind ?? null,
                            hashtags: repostSocial.hashtags ?? [],
                            mediaType: repostSocial.mediaType ?? null,
                            mediaUrl: repostSocial.mediaUrl ?? null,
                          }
                        : undefined,
                    },
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
            isPinned: user.pinnedPostId === post.id,
          };
        })
      : [];

    const posts = (() => {
      if (!pinnedPostPayload) return mappedPosts;
      if (mappedPosts.some((p) => p.id === pinnedPostPayload.id)) {
        return mappedPosts.map((p) =>
          p.id === pinnedPostPayload.id ? { ...p, isPinned: true } : p
        );
      }
      return [pinnedPostPayload, ...mappedPosts];
    })();

    const authoredComments = canViewContent
      ? await prisma.comment.findMany({
          where: {
            authorUserId: user.id,
            status: "ACTIVE",
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            post: {
              select: {
                id: true,
                slug: true,
                title: true,
              },
            },
          },
        })
      : [];

    const replies = authoredComments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      post: comment.post
        ? {
            id: comment.post.id,
            slug: comment.post.slug,
            title: comment.post.title,
          }
        : null,
    }));

    const repostPosts = canViewContent
      ? await prisma.post.findMany({
          where: {
            authorUserId: user.id,
            status: "PUBLISHED",
            repostOfPostId: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            category: true,
            source: true,
            author: {
              include: {
                profile: true,
              },
            },
            comments: true,
            likes: true,
            reposts: true,
            bookmarks: true,
            repostOfPost: {
              include: {
                category: true,
                source: true,
                author: {
                  include: {
                    profile: true,
                  },
                },
                comments: true,
                likes: true,
                reposts: true,
                bookmarks: true,
              },
            },
          },
        })
      : [];

    const reposts = repostPosts.map((post) => ({
      ...(() => {
        const social = getSocialMetadata(post.metadata);
        return {
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
      })(),
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
      repostOfPost: post.repostOfPost
        ? {
            id: post.repostOfPost.id,
            title: post.repostOfPost.title,
            slug: post.repostOfPost.slug,
            excerpt: post.repostOfPost.excerpt,
            content: post.repostOfPost.content,
            coverImageUrl: post.repostOfPost.coverImageUrl,
            createdAt: post.repostOfPost.createdAt.toISOString(),
            updatedAt: post.repostOfPost.updatedAt.toISOString(),
            commentsCount: post.repostOfPost.comments.length,
            likesCount: post.repostOfPost.likes.length,
            repostsCount: post.repostOfPost.reposts.length,
            bookmarksCount: post.repostOfPost.bookmarks.length,
            viewsCount:
              post.repostOfPost.comments.length +
              post.repostOfPost.likes.length +
              post.repostOfPost.reposts.length +
              post.repostOfPost.bookmarks.length +
              1,
            category: post.repostOfPost.category
              ? {
                  id: post.repostOfPost.category.id,
                  name: post.repostOfPost.category.name,
                  slug: post.repostOfPost.category.slug,
                }
              : null,
            source: post.repostOfPost.source
              ? {
                  id: post.repostOfPost.source.id,
                  name: post.repostOfPost.source.name,
                  slug: post.repostOfPost.source.slug,
                }
              : null,
            author: post.repostOfPost.author
              ? {
                  id: post.repostOfPost.author.id,
                  email: post.repostOfPost.author.email,
                  username: post.repostOfPost.author.username,
                  displayName:
                    post.repostOfPost.author.profile?.displayName ??
                    post.repostOfPost.author.username,
                  avatarUrl: post.repostOfPost.author.profile?.avatarUrl ?? null,
                }
              : null,
            metadata: (() => {
              const repostSocial = getSocialMetadata(post.repostOfPost.metadata);
              return {
                social: repostSocial
                  ? {
                      postKind: repostSocial.postKind ?? null,
                      hashtags: repostSocial.hashtags ?? [],
                      mediaType: repostSocial.mediaType ?? null,
                      mediaUrl: repostSocial.mediaUrl ?? null,
                    }
                  : undefined,
              };
            })(),
          }
        : null,
      author: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.profile?.displayName ?? user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
        isFollowing,
        isOwnProfile,
      },
      isPinned: false,
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          profile: user.profile
            ? {
                displayName: user.profile.displayName,
                bio: user.profile.bio,
                avatarUrl: user.profile.avatarUrl ?? null,
                locale: user.profile.locale,
                timezone: user.profile.timezone,
                isPrivateAccount: user.profile.isPrivateAccount,
                showConnectionsPublic: !followVisibilityPrivate,
              }
            : null,
          roles: user.userRoles.map((entry) => ({
            key: entry.role.key,
            name: entry.role.name,
          })),
          followersCount: safeFollowersCount,
          followingCount: safeFollowingCount,
          isOwnProfile,
          followVisibilityPrivate,
          isFollowing,
          isPrivateAccount,
          posts,
          replies,
          reposts,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PUBLIC_USER_PROFILE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load public user profile",
        },
      },
      { status: 400 }
    );
  }
}
