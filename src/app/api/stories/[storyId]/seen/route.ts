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

export async function POST(_: Request, context: { params: Promise<{ storyId: string }> }) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const viewerId = auth.current.user.id;
  const { storyId } = await context.params;

  const story = await prisma.story.findFirst({
    where: { id: storyId, deletedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, authorUserId: true },
  });

  if (!story) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Story not found or expired" } }, { status: 404 });
  }

  if (story.authorUserId === viewerId) {
    return NextResponse.json({ success: true, data: { ignored: true, reason: "owner_view" } });
  }

  await prisma.storyView.upsert({
    where: { storyId_viewerUserId: { storyId, viewerUserId: viewerId } },
    update: { viewedAt: new Date() },
    create: { storyId, viewerUserId: viewerId },
  });

  return NextResponse.json({ success: true, data: { storyId, viewerUserId: viewerId } });
}
