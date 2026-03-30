import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";
import { createInAppNotification } from "@/services/notification-service";

type ViewerSide = "A" | "B";

type ReplyMeta = {
  messageId: string;
  senderUserId: string | null;
  senderDisplayName: string | null;
  previewText: string | null;
};

const REPLY_META_PREFIX = "[[waraqhur-reply-meta]]";

function getViewerSide(
  participantAUserId: string,
  participantBUserId: string,
  userId: string
): ViewerSide | null {
  if (participantAUserId === userId) return "A";
  if (participantBUserId === userId) return "B";
  return null;
}

function viewerDeletedField(side: ViewerSide) {
  return side === "A" ? "deletedForViewerAAt" : "deletedForViewerBAt";
}

function safePreviewText(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 180);
}

function encodeMessageBody(body: string, replyMeta: ReplyMeta | null) {
  if (!replyMeta) return body;

  const meta = JSON.stringify({
    messageId: replyMeta.messageId,
    senderUserId: replyMeta.senderUserId,
    senderDisplayName: replyMeta.senderDisplayName,
    previewText: replyMeta.previewText,
  });

  return `${REPLY_META_PREFIX}${meta}\n${body}`;
}

function decodeMessageBody(storedBody: string) {
  if (!storedBody.startsWith(REPLY_META_PREFIX)) {
    return {
      body: storedBody,
      replyTo: null as ReplyMeta | null,
    };
  }

  const firstNewLine = storedBody.indexOf("\n");
  if (firstNewLine < 0) {
    return {
      body: storedBody,
      replyTo: null as ReplyMeta | null,
    };
  }

  const metaRaw = storedBody.slice(REPLY_META_PREFIX.length, firstNewLine).trim();
  const plainBody = storedBody.slice(firstNewLine + 1);

  try {
    const parsed = JSON.parse(metaRaw) as {
      messageId?: unknown;
      senderUserId?: unknown;
      senderDisplayName?: unknown;
      previewText?: unknown;
    };

    const messageId =
      typeof parsed.messageId === "string" ? parsed.messageId.trim() : "";
    if (!messageId) {
      return { body: plainBody, replyTo: null as ReplyMeta | null };
    }

    return {
      body: plainBody,
      replyTo: {
        messageId,
        senderUserId:
          typeof parsed.senderUserId === "string" && parsed.senderUserId.trim()
            ? parsed.senderUserId.trim()
            : null,
        senderDisplayName:
          typeof parsed.senderDisplayName === "string" && parsed.senderDisplayName.trim()
            ? parsed.senderDisplayName.trim()
            : null,
        previewText:
          typeof parsed.previewText === "string" && parsed.previewText.trim()
            ? parsed.previewText.trim()
            : null,
      } as ReplyMeta,
    };
  } catch {
    return {
      body: storedBody,
      replyTo: null as ReplyMeta | null,
    };
  }
}

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

    const side = getViewerSide(
      thread.participantAUserId,
      thread.participantBUserId,
      userId
    );

    if (!side) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_FORBIDDEN", message: "Thread not accessible" },
        },
        { status: 403 }
      );
    }

    const deletedField = viewerDeletedField(side);

    await prisma.directMessage.updateMany({
      where: {
        threadId: thread.id,
        senderUserId: { not: userId },
        readAt: null,
        [deletedField]: null,
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

    const visibleMessages = await prisma.directMessage.findMany({
      where: {
        threadId: thread.id,
        [deletedField]: null,
      },
      include: {
        sender: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const otherUser =
      thread.participantAUserId === userId ? thread.participantB : thread.participantA;

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

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          id: thread.id,
          isBlocked,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            displayName: otherUser.profile?.displayName ?? otherUser.username,
            avatarUrl: otherUser.profile?.avatarUrl ?? null,
          },
          messages: visibleMessages.map((message) => {
            const decoded = decodeMessageBody(message.body);

            return {
              id: message.id,
              body: decoded.body,
              replyTo: decoded.replyTo,
              contentType: message.contentType,
              mediaUrl: message.mediaUrl ?? null,
              mediaMimeType: message.mediaMimeType ?? null,
              mediaSizeBytes: message.mediaSizeBytes ?? null,
              createdAt: message.createdAt.toISOString(),
              readAt: message.readAt?.toISOString() ?? null,
              senderUserId: message.senderUserId,
              isMine: message.senderUserId === userId,
              sender: {
                id: message.sender.id,
                username: message.sender.username,
                displayName:
                  message.sender.profile?.displayName ?? message.sender.username,
                avatarUrl: message.sender.profile?.avatarUrl ?? null,
              },
            };
          }),
        },
        currentUserId: userId,
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

    const replyToMessageId =
      typeof body.replyToMessageId === "string" ? body.replyToMessageId.trim() : "";

    const replySenderUserId =
      typeof body.replySenderUserId === "string" ? body.replySenderUserId.trim() : null;

    const replySenderDisplayName =
      typeof body.replySenderDisplayName === "string"
        ? body.replySenderDisplayName.trim()
        : null;

    const replyPreviewText =
      typeof body.replyPreviewText === "string"
        ? safePreviewText(body.replyPreviewText)
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

    if (replyToMessageId) {
      const exists = await prisma.directMessage.findFirst({
        where: {
          id: replyToMessageId,
          threadId: thread.id,
        },
        select: { id: true },
      });

      if (!exists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_REPLY_TARGET",
              message: "Reply target not found in this thread",
            },
          },
          { status: 400 }
        );
      }
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

    const normalizedBody = hasText ? messageBody : "[image]";
    const replyMeta: ReplyMeta | null = replyToMessageId
      ? {
          messageId: replyToMessageId,
          senderUserId: replySenderUserId,
          senderDisplayName: replySenderDisplayName,
          previewText: replyPreviewText,
        }
      : null;

    const storedBody = encodeMessageBody(normalizedBody, replyMeta);

    const message = await prisma.directMessage.create({
      data: {
        threadId: thread.id,
        senderUserId: userId,
        body: storedBody,
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
          replyToMessageId: replyToMessageId || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          body: normalizedBody,
          replyTo: replyMeta,
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
    const deleteScope =
      body.deleteScope === "for_everyone" ? "for_everyone" : "for_me";

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

    const side = getViewerSide(
      thread.participantAUserId,
      thread.participantBUserId,
      userId
    );

    if (!side) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "THREAD_FORBIDDEN", message: "Thread not accessible" },
        },
        { status: 403 }
      );
    }

    const deletedField = viewerDeletedField(side);

    const result = await prisma.$transaction(async (tx) => {
      const baseWhere = deleteAll
        ? {
            threadId: thread.id,
            senderUserId: userId,
          }
        : {
            threadId: thread.id,
            senderUserId: userId,
            id: { in: messageIds },
          };

      let affectedCount = 0;

      if (deleteScope === "for_everyone") {
        const deleted = await tx.directMessage.deleteMany({
          where: baseWhere,
        });
        affectedCount = deleted.count;
      } else {
        const now = new Date();

        const updated = await tx.directMessage.updateMany({
          where: {
            ...baseWhere,
            [deletedField]: null,
          },
          data:
            side === "A"
              ? { deletedForViewerAAt: now }
              : { deletedForViewerBAt: now },
        });

        affectedCount = updated.count;
      }

      const remainingTotal = await tx.directMessage.count({
        where: { threadId: thread.id },
      });

      const remainingVisibleForViewer = await tx.directMessage.count({
        where: {
          threadId: thread.id,
          [deletedField]: null,
        },
      });

      const threadDeleted = deleteScope === "for_everyone" && remainingTotal === 0;

      if (threadDeleted) {
        await tx.directThread.delete({
          where: { id: thread.id },
        });
      } else if (remainingTotal > 0) {
        await tx.directThread.update({
          where: { id: thread.id },
          data: { updatedAt: new Date() },
        });
      }

      return {
        affectedCount,
        threadDeleted,
        remainingVisibleForViewer,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.affectedCount,
        deleteAll,
        deleteScope,
        threadDeleted: result.threadDeleted,
        remainingVisibleForViewer: result.remainingVisibleForViewer,
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
