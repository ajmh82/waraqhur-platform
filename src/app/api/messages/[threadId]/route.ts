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
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      ),
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return {
      ok: true as const,
      current,
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "Invalid or expired session",
          },
        },
        { status: 401 }
      ),
    };
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { threadId } = await context.params;
    const userId = auth.current.user.id;

    const thread = await prisma.directThread.findFirst({
      where: {
        id: threadId,
        OR: [{ participantAUserId: userId }, { participantBUserId: userId }],
      },
      include: {
        participantA: { include: { profile: true } },
        participantB: { include: { profile: true } },
      },
    });

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_NOT_FOUND", message: "Thread not found" },
        },
        { status: 404 }
      );
    }

    const viewerIsParticipantA = thread.participantAUserId === userId;

    await prisma.directMessage.updateMany({
      where: {
        threadId: thread.id,
        senderUserId: { not: userId },
        readAt: null,
        ...(viewerIsParticipantA
          ? { deletedForViewerAAt: null }
          : { deletedForViewerBAt: null }),
      },
      data: { readAt: new Date() },
    });

    await prisma.notification.updateMany({
      where: {
        userId,
        channel: "IN_APP",
        readAt: null,
        AND: [
          { payload: { path: ["event"], equals: "dm.message.received" } },
          { payload: { path: ["metadata", "threadId"], equals: thread.id } },
        ],
      },
      data: {
        readAt: new Date(),
        status: "READ",
      },
    });

    await prisma.notification.updateMany({
      where: {
        userId,
        channel: "IN_APP",
        readAt: null,
        AND: [
          { payload: { path: ["event"], equals: "dm.request.accepted" } },
          { payload: { path: ["metadata", "threadId"], equals: thread.id } },
        ],
      },
      data: {
        readAt: new Date(),
        status: "READ",
      },
    });

    const refreshedThread = await prisma.directThread.findFirst({
      where: { id: thread.id },
      include: {
        participantA: { include: { profile: true } },
        participantB: { include: { profile: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { include: { profile: true } } },
        },
      },
    });

    if (!refreshedThread) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_NOT_FOUND", message: "Thread not found" },
        },
        { status: 404 }
      );
    }

    const otherUser =
      refreshedThread.participantAUserId === userId
        ? refreshedThread.participantB
        : refreshedThread.participantA;

    const isBlocked = Boolean(
      await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerUserId: userId, blockedUserId: otherUser.id },
            { blockerUserId: otherUser.id, blockedUserId: userId },
          ],
        },
        select: { blockerUserId: true },
      })
    );

    const visibleMessages = refreshedThread.messages.filter((message) =>
      viewerIsParticipantA
        ? message.deletedForViewerAAt === null
        : message.deletedForViewerBAt === null
    );

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          id: refreshedThread.id,
          isBlocked,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            displayName: otherUser.profile?.displayName ?? otherUser.username,
            avatarUrl: otherUser.profile?.avatarUrl ?? null,
          },
          messages: visibleMessages.map((message) => ({
            id: message.id,
            body: message.body,
            contentType: message.contentType,
            mediaUrl: message.mediaUrl ?? null,
            mediaMimeType: message.mediaMimeType ?? null,
            mediaSizeBytes: message.mediaSizeBytes ?? null,
            createdAt: message.createdAt.toISOString(),
            readAt: message.readAt?.toISOString() ?? null,
            senderUserId: message.senderUserId,
            seenByRecipient:
              message.senderUserId === userId
                ? false
                : message.readAt !== null,
            isMine: message.senderUserId === userId,
            sender: {
              id: message.sender.id,
              username: message.sender.username,
              displayName:
                message.sender.profile?.displayName ?? message.sender.username,
              avatarUrl: message.sender.profile?.avatarUrl ?? null,
            },
          })),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "GET_THREAD_FAILED",
          message: error instanceof Error ? error.message : "Failed to load thread",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { threadId } = await context.params;
    const userId = auth.current.user.id;
    const senderUsername = auth.current.user.username;
    const body = await request.json();

    const messageBody = typeof body.body === "string" ? body.body : "";
    const trimmedBody = messageBody.trim();

    const mediaUrl =
      typeof body.mediaUrl === "string" && body.mediaUrl.trim().length > 0
        ? body.mediaUrl.trim()
        : null;

    const mediaMimeType =
      typeof body.mediaMimeType === "string" && body.mediaMimeType.trim().length > 0
        ? body.mediaMimeType.trim()
        : null;

    const mediaSizeBytes =
      Number.isFinite(Number(body.mediaSizeBytes)) && Number(body.mediaSizeBytes) >= 0
        ? Math.floor(Number(body.mediaSizeBytes))
        : null;

    const hasText = trimmedBody.length > 0;
    const hasImage = Boolean(mediaUrl);

    if (!hasText && !hasImage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MESSAGE_BODY",
            message: "Message text or image is required",
          },
        },
        { status: 400 }
      );
    }

    if (hasImage && !mediaUrl!.startsWith("/uploads/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MEDIA_URL",
            message: "Media URL must be an uploaded file path",
          },
        },
        { status: 400 }
      );
    }

    if (mediaMimeType && !mediaMimeType.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MEDIA_TYPE",
            message: "Only image media is allowed in direct messages currently",
          },
        },
        { status: 400 }
      );
    }

    const thread = await prisma.directThread.findFirst({
      where: {
        id: threadId,
        OR: [{ participantAUserId: userId }, { participantBUserId: userId }],
      },
      select: {
        id: true,
        participantAUserId: true,
        participantBUserId: true,
      },
    });

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_NOT_FOUND", message: "Thread not found" },
        },
        { status: 404 }
      );
    }

    const receiverUserId =
      thread.participantAUserId === userId
        ? thread.participantBUserId
        : thread.participantAUserId;

    const blockRelation = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: userId, blockedUserId: receiverUserId },
          { blockerUserId: receiverUserId, blockedUserId: userId },
        ],
      },
      select: { blockerUserId: true, blockedUserId: true },
    });

    if (blockRelation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BLOCK_RELATION_EXISTS",
            message: "Messaging is not allowed between these users",
          },
        },
        { status: 403 }
      );
    }

    const message = await prisma.directMessage.create({
      data: {
        threadId: thread.id,
        senderUserId: userId,
        body: hasText ? messageBody : "[image]",
        mediaUrl,
        mediaMimeType,
        mediaSizeBytes,
      },
    });

    await prisma.directThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    await createInAppNotification({
      userId: receiverUserId,
      title: "رسالة جديدة",
      body: hasImage && !hasText
        ? `لديك صورة جديدة من @${senderUsername}`
        : `لديك رسالة جديدة من @${senderUsername}`,
      payload: {
        event: "dm.message.received",
        actionUrl: `/messages/${thread.id}`,
        entityType: "direct_message",
        entityId: message.id,
        metadata: {
          threadId: thread.id,
          senderUserId: userId,
          receiverUserId,
          hasImage,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          body: message.body,
          contentType: message.contentType,
          mediaUrl: message.mediaUrl ?? null,
          mediaMimeType: message.mediaMimeType ?? null,
          mediaSizeBytes: message.mediaSizeBytes ?? null,
          createdAt: message.createdAt.toISOString(),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SEND_MESSAGE_FAILED",
          message: error instanceof Error ? error.message : "Failed to send message",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { threadId } = await context.params;
    const userId = auth.current.user.id;
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const deleteAll = Boolean(body.deleteAll);
    const rawIds: unknown[] = Array.isArray(body.messageIds) ? body.messageIds : [];
    const messageIds = rawIds
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);

    if (!deleteAll && messageIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MESSAGE_IDS_REQUIRED",
            message: "Provide messageIds or set deleteAll=true",
          },
        },
        { status: 400 }
      );
    }

    const thread = await prisma.directThread.findFirst({
      where: {
        id: threadId,
        OR: [{ participantAUserId: userId }, { participantBUserId: userId }],
      },
      select: { id: true },
    });

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_NOT_FOUND", message: "Thread not found" },
        },
        { status: 404 }
      );
    }

    const isParticipantA = await prisma.directThread.findFirst({
      where: { id: thread.id, participantAUserId: userId },
      select: { id: true },
    });
    const viewerField = isParticipantA ? "deletedForViewerAAt" : "deletedForViewerBAt";
    const otherViewerField = isParticipantA ? "deletedForViewerBAt" : "deletedForViewerAAt";
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const markResult = await tx.directMessage.updateMany({
        where: deleteAll
          ? {
              threadId: thread.id,
              [viewerField]: null,
            }
          : {
              threadId: thread.id,
              id: { in: messageIds },
              [viewerField]: null,
            },
        data: {
          [viewerField]: now,
        },
      });

      const purgeResult = await tx.directMessage.deleteMany({
        where: {
          threadId: thread.id,
          [viewerField]: { not: null },
          [otherViewerField]: { not: null },
        },
      });

      const remainingVisibleCount = await tx.directMessage.count({
        where: {
          threadId: thread.id,
          [viewerField]: null,
        },
      });

      const remainingAnyCount = await tx.directMessage.count({
        where: { threadId: thread.id },
      });

      if (remainingAnyCount === 0) {
        await tx.directThread.delete({
          where: { id: thread.id },
        });
      } else {
        await tx.directThread.update({
          where: { id: thread.id },
          data: { updatedAt: new Date() },
        });
      }

      return {
        deletedCount: markResult.count,
        purgedCount: purgeResult.count,
        threadDeleted: remainingAnyCount === 0,
        hiddenForViewer: remainingVisibleCount === 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        purgedCount: result.purgedCount,
        deleteAll,
        threadDeleted: result.threadDeleted,
        hiddenForViewer: result.hiddenForViewer,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DELETE_MESSAGES_FAILED",
          message: error instanceof Error ? error.message : "Failed to delete messages",
        },
      },
      { status: 400 }
    );
  }
}
