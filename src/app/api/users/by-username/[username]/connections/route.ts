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
              select: {
                followerId: true,
              },
              orderBy: { createdAt: "desc" },
            }
          : false,
        following: includeFollowing
          ? {
              select: {
                followingId: true,
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

    const followVisibilityPrivate = Boolean(user.profile?.followVisibilityPrivate);
    const canShowConnections = !followVisibilityPrivate || viewerUserId === user.id;

    if (!canShowConnections) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            displayName: user.profile?.displayName ?? user.username,
            avatarUrl: user.profile?.avatarUrl ?? null,
            followersCount: 0,
            followingCount: 0,
          },
          followers: [],
          following: [],
          hidden: true,
        },
      });
    }

    const followerIds = includeFollowers
      ? (user.followers ?? []).map((entry) => entry.followerId)
      : [];
    const followingIds = includeFollowing
      ? (user.following ?? []).map((entry) => entry.followingId)
      : [];

    const candidateIds = Array.from(new Set([...followerIds, ...followingIds]));
    const users = candidateIds.length
      ? await prisma.user.findMany({
          where: { id: { in: candidateIds } },
          include: { profile: true },
        })
      : [];

    const usersById = new Map(users.map((u) => [u.id, u]));

    let viewerFollowingSet = new Set<string>();
    if (viewerUserId && candidateIds.length > 0) {
      const relations = await prisma.follow.findMany({
        where: {
          followerId: viewerUserId,
          followingId: { in: candidateIds },
        },
        select: { followingId: true },
      });

      viewerFollowingSet = new Set(relations.map((r) => r.followingId));
    }

    const followers = followerIds
      .map((id) => usersById.get(id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.profile?.displayName ?? u.username,
        avatarUrl: u.profile?.avatarUrl ?? null,
        isFollowing: viewerFollowingSet.has(u.id),
      }));

    const following = followingIds
      .map((id) => usersById.get(id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.profile?.displayName ?? u.username,
        avatarUrl: u.profile?.avatarUrl ?? null,
        isFollowing: viewerFollowingSet.has(u.id),
      }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.profile?.displayName ?? user.username,
          avatarUrl: user.profile?.avatarUrl ?? null,
          followersCount: followers.length,
          followingCount: following.length,
        },
        followers,
        following,
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
