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
      response: NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }, { status: 401 }),
    };
  }
  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return { ok: true as const, current };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: { code: "INVALID_SESSION", message: "Invalid session" } }, { status: 401 }),
    };
  }
}

async function isAdmin(userId: string) {
  const role = await prisma.userRole.findFirst({
    where: { userId, role: { key: "admin" } },
    select: { id: true },
  });
  return Boolean(role);
}

export async function GET(_: Request, context: { params: Promise<{ storyId: string }> }) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const actorId = auth.current.user.id;
  const { storyId } = await context.params;

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, authorUserId: true },
  });

  if (!story) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Story not found" } }, { status: 404 });
  }

  const allowed = story.authorUserId === actorId || (await isAdmin(actorId));
  if (!allowed) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 });
  }

  const views = await prisma.storyView.findMany({
    where: { storyId },
    include: { viewer: { include: { profile: true } } },
    orderBy: { viewedAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    success: true,
    data: {
      count: views.length,
      viewers: views.map((v) => ({
        id: v.viewer.id,
        username: v.viewer.username,
        displayName: v.viewer.profile?.displayName ?? v.viewer.username,
        avatarUrl: v.viewer.profile?.avatarUrl ?? null,
        viewedAt: v.viewedAt.toISOString(),
      })),
    },
  });
}
