import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
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
        { success: false, error: { code: "INVALID_SESSION", message: "Invalid session" } },
        { status: 401 }
      ),
    };
  }
}

export async function GET() {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const viewerId = auth.current.user.id;
  const now = new Date();

  const followingRows = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = new Set(followingRows.map((r) => r.followingId));

  const stories = await prisma.story.findMany({
    where: {
      deletedAt: null,
      expiresAt: { gt: now },
      OR: [
        { privacy: "AUTHENTICATED" },
        { authorUserId: viewerId },
        { privacy: "FOLLOWERS", author: { followers: { some: { followerId: viewerId } } } },
        { privacy: "PRIVATE", authorUserId: viewerId },
        { privacy: "CLOSE_FRIENDS", authorUserId: viewerId },
      ],
    },
    include: {
      author: { include: { profile: true } },
      views: { where: { viewerUserId: viewerId }, select: { id: true }, take: 1 },
      _count: { select: { views: true } },
    },
    orderBy: [{ authorUserId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    take: 1000,
  });

  const groupsMap = new Map<string, any>();

  for (const s of stories) {
    if (!groupsMap.has(s.authorUserId)) {
      groupsMap.set(s.authorUserId, {
        author: {
          id: s.author.id,
          username: s.author.username,
          displayName: s.author.profile?.displayName ?? s.author.username,
          avatarUrl: s.author.profile?.avatarUrl ?? null,
        },
        stories: [],
      });
    }

    groupsMap.get(s.authorUserId).stories.push({
      id: s.id,
      type: s.type,
      mediaUrl: s.mediaUrl,
      thumbnailUrl: s.thumbnailUrl,
      textContent: s.textContent,
      backgroundStyle: s.backgroundStyle,
      caption: s.caption,
      privacy: s.privacy,
      durationSeconds: s.durationSeconds,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isSeen: s.views.length > 0,
      viewCount: s._count.views,
      isOwner: s.authorUserId === viewerId,
    });
  }

  const groups = Array.from(groupsMap.values()).map((g) => ({
    ...g,
    hasUnseen: g.stories.some((x: any) => !x.isSeen && !x.isOwner),
    lastCreatedAt: g.stories[g.stories.length - 1]?.createdAt ?? null,
  }));

  groups.sort((a, b) => {
    const aMine = a.author.id === viewerId ? 0 : 1;
    const bMine = b.author.id === viewerId ? 0 : 1;
    if (aMine !== bMine) return aMine - bMine;

    const aFollowing = followingIds.has(a.author.id) ? 0 : 1;
    const bFollowing = followingIds.has(b.author.id) ? 0 : 1;
    if (aFollowing !== bFollowing) return aFollowing - bFollowing;

    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;

    return String(b.lastCreatedAt).localeCompare(String(a.lastCreatedAt));
  });

  return NextResponse.json({
    success: true,
    data: {
      groups,
      generatedAt: now.toISOString(),
    },
  });
}
