import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromSession } from "@/services/auth-service";

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
            comments: true,
            likes: true,
            reposts: true,
            bookmarks: true,
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
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              createdAt: true,
              category: true,
              source: true,
              comments: true,
              likes: true,
              reposts: true,
              bookmarks: true,
            },
          })
        : null;

    const pinnedPostPayload = pinnedPost
      ? {
          id: pinnedPost.id,
          title: pinnedPost.title,
          slug: pinnedPost.slug,
          excerpt: pinnedPost.excerpt,
          createdAt: pinnedPost.createdAt.toISOString(),
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
          isPinned: true,
        }
      : null;

    const mappedPosts = canViewContent
      ? user.authoredPosts.map((post) => ({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          createdAt: post.createdAt.toISOString(),
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
          isPinned: user.pinnedPostId === post.id,
        }))
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
