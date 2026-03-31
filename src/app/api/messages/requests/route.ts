import type { DMRequestStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { createInAppNotification } from "@/services/notification-service";

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        },
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
        {
          success: false,
          error: { code: "INVALID_SESSION", message: "Invalid or expired session" },
        },
        { status: 401 }
      ),
    };
  }
}

function isDMRequestStatus(value: string | null): value is DMRequestStatus {
  return value === "PENDING" || value === "ACCEPTED" || value === "REJECTED" || value === "CANCELED";
}

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const userId = auth.current.user.id;
    const { searchParams } = new URL(request.url);
    const box = searchParams.get("box");
    const status = searchParams.get("status");

    const whereBase =
      box === "incoming"
        ? { targetUserId: userId }
        : box === "outgoing"
          ? { requesterUserId: userId }
          : { OR: [{ requesterUserId: userId }, { targetUserId: userId }] };

    const where =
      status && status !== "all" && isDMRequestStatus(status)
        ? { ...whereBase, status }
        : whereBase;

    const requests = await prisma.directMessageRequest.findMany({
      where,
      include: {
        requester: { include: { profile: true } },
        target: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        requests: requests.map((r) => ({
          id: r.id,
          status: r.status,
          note: r.note ?? null,
          createdAt: r.createdAt.toISOString(),
          respondedAt: r.respondedAt?.toISOString() ?? null,
          requester: {
            id: r.requester.id,
            username: r.requester.username,
            displayName: r.requester.profile?.displayName ?? r.requester.username,
            avatarUrl: r.requester.profile?.avatarUrl ?? null,
          },
          target: {
            id: r.target.id,
            username: r.target.username,
            displayName: r.target.profile?.displayName ?? r.target.username,
            avatarUrl: r.target.profile?.avatarUrl ?? null,
          },
          isIncoming: r.targetUserId === userId,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_DM_REQUESTS_FAILED",
          message: error instanceof Error ? error.message : "Failed to load DM requests",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const requesterUserId = auth.current.user.id;
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: { code: "TARGET_USER_REQUIRED", message: "Target user is required" } },
        { status: 400 }
      );
    }

    if (targetUserId === requesterUserId) {
      return NextResponse.json(
        { success: false, error: { code: "SELF_REQUEST_NOT_ALLOWED", message: "Cannot request yourself" } },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, directMessagesEnabled: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "Target user not found" } },
        { status: 404 }
      );
    }

    if (!targetUser.directMessagesEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DM_CLOSED", message: "This user has disabled private message requests" },
        },
        { status: 403 }
      );
    }

    const blockCheck = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: requesterUserId, blockedUserId: targetUserId },
          { blockerUserId: targetUserId, blockedUserId: requesterUserId },
        ],
      },
      select: { blockerUserId: true },
    });

    if (blockCheck) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BLOCK_RELATION_ACTIVE", message: "Messaging is blocked between these users" },
        },
        { status: 403 }
      );
    }

    const [participantAUserId, participantBUserId] =
      requesterUserId < targetUserId ? [requesterUserId, targetUserId] : [targetUserId, requesterUserId];

    const existingThread = await prisma.directThread.findUnique({
      where: {
        participantAUserId_participantBUserId: {
          participantAUserId,
          participantBUserId,
        },
      },
      select: { id: true },
    });

    if (existingThread) {
      return NextResponse.json({
        success: true,
        data: {
          thread: { id: existingThread.id },
          request: null,
          mode: "thread_exists",
        },
      });
    }

    const dmRequest = await prisma.directMessageRequest.upsert({
      where: { requesterUserId_targetUserId: { requesterUserId, targetUserId } },
      update: { status: "PENDING", note, respondedAt: null },
      create: { requesterUserId, targetUserId, status: "PENDING", note },
    });

    await createInAppNotification({
      userId: targetUserId,
      title: "New chat request",
      body: `لديك طلب محادثة جديد من @${auth.current.user.username}`,
      payload: {
        event: "dm.request.sent",
        actionUrl: "/messages",
        entityType: "direct_message_request",
        entityId: dmRequest.id,
        metadata: {
          requestId: dmRequest.id,
          requesterUserId,
          targetUserId,
          requesterUsername: auth.current.user.username,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        request: { id: dmRequest.id, status: dmRequest.status },
        thread: null,
        mode: "request_sent",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CREATE_DM_REQUEST_FAILED",
          message: error instanceof Error ? error.message : "Failed to create DM request",
        },
      },
      { status: 400 }
    );
  }
}
