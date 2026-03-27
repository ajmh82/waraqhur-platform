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
      where: {
        username,
      },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
          orderBy: {
            assignedAt: "asc",
          },
        },
        authoredPosts: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
          include: {
            category: true,
            source: true,
            comments: true,
          },
        },
        followers: true,
        following: true,
        authoredComments: {
          orderBy: {
            createdAt: "desc",
          },
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
        },
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
                avatarUrl: user.profile.avatarUrl,
                locale: user.profile.locale,
                timezone: user.profile.timezone,
              }
            : null,
          roles: user.userRoles.map((entry) => ({
            key: entry.role.key,
            name: entry.role.name,
          })),
          followersCount: user.followers.length,
          followingCount: user.following.length,
          isOwnProfile,
          isFollowing,
          posts: user.authoredPosts.map((post) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            createdAt: post.createdAt.toISOString(),
            commentsCount: post.comments.length,
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
          })),
          replies: user.authoredComments.map((comment) => ({
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
          })),
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
