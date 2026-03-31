import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";
import { createInAppNotification } from "@/services/notification-service";
import { userHasPermission } from "@/services/authorization-service";

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
    const canReadAllMessages = await userHasPermission(userId, "messages.read_all");

    const thread = await prisma.directThread.findFirst({
      where: canReadAllMessages
        ? { id: threadId }
        : {
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

    const isParticipant =
      thread.participantAUserId === userId || thread.participantBUserId === userId;

    if (isParticipant) {
      await prisma.directMessage.updateMany({
        where: {
          threadId: thread.id,
          senderUserId: { not: userId },
          readAt: null,
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
    }

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

    const otherUser = isParticipant
      ? refreshedThread.participantAUserId === userId
        ? refreshedThread.participantB
        : refreshedThread.participantA
      : refreshedThread.participantA;

    const isBlocked = Boolean(
      await prisma.userBlock.findFirst({
        where: {
          OR: [
            {
              blockerUserId: refreshedThread.participantAUserId,
              blockedUserId: refreshedThread.participantBUserId,
            },
            {
              blockerUserId: refreshedThread.participantBUserId,
              blockedUserId: refreshedThread.participantAUserId,
            },
          ],
        },
        select: { blockerUserId: true },
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          id: refreshedThread.id,
          isBlocked,
          canReply: isParticipant,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            displayName: otherUser.profile?.displayName ?? otherUser.username,
            avatarUrl: otherUser.profile?.avatarUrl ?? null,
          },
          messages: refreshedThread.messages.map((message) => ({
            id: message.id,
            body: message.body,
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
          })),
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
    const canReadAllMessages = await userHasPermission(userId, "messages.read_all");
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
      where: { id: threadId },
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

    const isParticipant =
      thread.participantAUserId === userId || thread.participantBUserId === userId;

    if (!isParticipant) {
      if (canReadAllMessages) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "AUDIT_READ_ONLY_THREAD",
              message:
                "This conversation is in read-only audit mode. Sending is allowed only for participants.",
            },
          },
          { status: 403 }
        );
      }

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
