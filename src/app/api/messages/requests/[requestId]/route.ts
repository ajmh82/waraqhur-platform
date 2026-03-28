import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    const userId = auth.current.user.id;
    const { requestId } = await context.params;
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const action = typeof body.action === "string" ? body.action.toLowerCase() : "";

    if (!["accept", "reject", "cancel"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ACTION", message: "Action must be accept/reject/cancel" },
        },
        { status: 400 }
      );
    }

    const dmRequest = await prisma.directMessageRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, username: true } },
        target: { select: { id: true, username: true } },
      },
    });

    if (!dmRequest) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "REQUEST_NOT_FOUND", message: "Request not found" },
        },
        { status: 404 }
      );
    }

    if (dmRequest.status !== "PENDING") {
      return NextResponse.json({
        success: true,
        data: {
          request: { id: dmRequest.id, status: dmRequest.status },
          thread: null,
          mode: "already_processed",
        },
      });
    }

    if (action === "cancel") {
      if (dmRequest.requesterUserId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "Only requester can cancel" },
          },
          { status: 403 }
        );
      }

      const updated = await prisma.directMessageRequest.update({
        where: { id: dmRequest.id },
        data: { status: "CANCELED", respondedAt: new Date() },
      });

      await prisma.notification.updateMany({
        where: {
          userId,
          channel: "IN_APP",
          readAt: null,
          AND: [
            { payload: { path: ["event"], equals: "dm.request.sent" } },
            { payload: { path: ["metadata", "requestId"], equals: dmRequest.id } },
          ],
        },
        data: { status: "READ", readAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        data: {
          request: { id: updated.id, status: updated.status },
          thread: null,
          mode: "canceled",
        },
      });
    }

    if (dmRequest.targetUserId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Only target user can respond" },
        },
        { status: 403 }
      );
    }

    if (action === "reject") {
      const updated = await prisma.directMessageRequest.update({
        where: { id: dmRequest.id },
        data: { status: "REJECTED", respondedAt: new Date() },
      });

      await createInAppNotification({
        userId: dmRequest.requesterUserId,
        title: "تم رفض طلب المحادثة",
        body: `تم رفض طلب محادثتك من @${dmRequest.target.username}`,
        payload: {
          event: "dm.request.rejected",
          actionUrl: "/messages",
          entityType: "direct_message_request",
          entityId: dmRequest.id,
          metadata: {
            requestId: dmRequest.id,
            requesterUserId: dmRequest.requesterUserId,
            targetUserId: dmRequest.targetUserId,
          },
        },
      });

      await prisma.notification.updateMany({
        where: {
          userId,
          channel: "IN_APP",
          readAt: null,
          AND: [
            { payload: { path: ["event"], equals: "dm.request.sent" } },
            { payload: { path: ["metadata", "requestId"], equals: dmRequest.id } },
          ],
        },
        data: { status: "READ", readAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        data: {
          request: { id: updated.id, status: updated.status },
          thread: null,
          mode: "rejected",
        },
      });
    }


    const blockRelation = await prisma.userBlock.findFirst({
      where: {
        OR: [
          {
            blockerUserId: dmRequest.requesterUserId,
            blockedUserId: dmRequest.targetUserId,
          },
          {
            blockerUserId: dmRequest.targetUserId,
            blockedUserId: dmRequest.requesterUserId,
          },
        ],
      },
      select: { blockerUserId: true },
    });

    if (blockRelation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BLOCK_RELATION_ACTIVE",
            message: "Messaging is blocked between these users",
          },
        },
        { status: 403 }
      );
    }

    const [participantAUserId, participantBUserId] =
      dmRequest.requesterUserId < dmRequest.targetUserId
        ? [dmRequest.requesterUserId, dmRequest.targetUserId]
        : [dmRequest.targetUserId, dmRequest.requesterUserId];

    const thread = await prisma.directThread.upsert({
      where: {
        participantAUserId_participantBUserId: {
          participantAUserId,
          participantBUserId,
        },
      },
      update: { updatedAt: new Date() },
      create: { participantAUserId, participantBUserId },
    });

    const updated = await prisma.directMessageRequest.update({
      where: { id: dmRequest.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await createInAppNotification({
      userId: dmRequest.requesterUserId,
      title: "تم قبول طلب المحادثة",
      body: `وافق @${dmRequest.target.username} على طلب المحادثة`,
      payload: {
        event: "dm.request.accepted",
        actionUrl: `/messages/${thread.id}`,
        entityType: "direct_message_request",
        entityId: dmRequest.id,
        metadata: {
          requestId: dmRequest.id,
          threadId: thread.id,
          requesterUserId: dmRequest.requesterUserId,
          targetUserId: dmRequest.targetUserId,
        },
      },
    });

    await prisma.notification.updateMany({
      where: {
        userId,
        channel: "IN_APP",
        readAt: null,
        AND: [
          { payload: { path: ["event"], equals: "dm.request.sent" } },
          { payload: { path: ["metadata", "requestId"], equals: dmRequest.id } },
        ],
      },
      data: { status: "READ", readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        request: { id: updated.id, status: updated.status },
        thread: { id: thread.id },
        mode: "accepted",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPDATE_DM_REQUEST_FAILED",
          message: error instanceof Error ? error.message : "Failed to update DM request",
        },
      },
      { status: 400 }
    );
  }
}
