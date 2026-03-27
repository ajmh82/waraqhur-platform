import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

async function getViewerUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!session) return null;
    const current = await getCurrentUserFromSession(session);
    return current.user.id;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const viewerUserId = await getViewerUserId();

    const includeFollowers = type !== "following";
    const includeFollowing = type !== "followers";

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        followers: includeFollowers
          ? {
              include: {
                follower: {
                  include: {
                    profile: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            }
          : false,
        following: includeFollowing
          ? {
              include: {
                following: {
                  include: {
                    profile: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            }
          : false,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    const followerUsers = includeFollowers
      ? (user.followers ?? []).map((entry) => entry.follower)
      : [];
    const followingUsers = includeFollowing
      ? (user.following ?? []).map((entry) => entry.following)
      : [];

    const candidateIds = Array.from(
      new Set([...followerUsers.map((u) => u.id), ...followingUsers.map((u) => u.id)])
    );

    let viewerFollowingSet = new Set<string>();
    if (viewerUserId && candidateIds.length > 0) {
      const relations = await prisma.userFollow.findMany({
        where: {
          followerUserId: viewerUserId,
          followingUserId: { in: candidateIds },
        },
        select: { followingUserId: true },
      });
      viewerFollowingSet = new Set(relations.map((r) => r.followingUserId));
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
          followersCount: user.followersCount ?? followerUsers.length,
          followingCount: user.followingCount ?? followingUsers.length,
        },
        followers: followerUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName ?? u.username,
          avatarUrl: u.profile?.avatarUrl ?? null,
          isFollowing: viewerFollowingSet.has(u.id),
        })),
        following: followingUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.profile?.displayName ?? u.username,
          avatarUrl: u.profile?.avatarUrl ?? null,
          isFollowing: viewerFollowingSet.has(u.id),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "USER_CONNECTIONS_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load user connections",
        },
      },
      { status: 400 }
    );
  }
}
