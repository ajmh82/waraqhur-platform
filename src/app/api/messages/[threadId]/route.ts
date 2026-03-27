import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";

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
        participantA: {
          include: {
            profile: true,
          },
        },
        participantB: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "THREAD_NOT_FOUND",
            message: "Thread not found",
          },
        },
        { status: 404 }
      );
    }

    await prisma.directMessage.updateMany({
      where: {
        threadId: thread.id,
        senderUserId: {
          not: userId,
        },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const refreshedThread = await prisma.directThread.findFirst({
      where: {
        id: thread.id,
      },
      include: {
        participantA: {
          include: {
            profile: true,
          },
        },
        participantB: {
          include: {
            profile: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!refreshedThread) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "THREAD_NOT_FOUND",
            message: "Thread not found",
          },
        },
        { status: 404 }
      );
    }

    const otherUser =
      refreshedThread.participantAUserId === userId
        ? refreshedThread.participantB
        : refreshedThread.participantA;

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          id: refreshedThread.id,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            displayName:
              otherUser.profile?.displayName ?? otherUser.username,
            avatarUrl: otherUser.profile?.avatarUrl ?? null,
          },
          messages: refreshedThread.messages.map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            readAt: message.readAt?.toISOString() ?? null,
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
          message:
            error instanceof Error ? error.message : "Failed to load thread",
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
    const body = await request.json();
    const messageBody =
      typeof body.body === "string" ? body.body.trim() : "";

    if (!messageBody) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MESSAGE_BODY",
            message: "Message body is required",
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
    });

    if (!thread) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "THREAD_NOT_FOUND",
            message: "Thread not found",
          },
        },
        { status: 404 }
      );
    }

    const message = await prisma.directMessage.create({
      data: {
        threadId: thread.id,
        senderUserId: userId,
        body: messageBody,
      },
    });

    await prisma.directThread.update({
      where: {
        id: thread.id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          body: message.body,
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
          message:
            error instanceof Error ? error.message : "Failed to send message",
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
    const rawIds = Array.isArray(body.messageIds) ? body.messageIds : [];
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
          error: {
            code: "THREAD_NOT_FOUND",
            message: "Thread not found",
          },
        },
        { status: 404 }
      );
    }

    const deleted = await prisma.directMessage.deleteMany({
      where: deleteAll
        ? { threadId: thread.id }
        : { threadId: thread.id, id: { in: messageIds } },
    });

    await prisma.directThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: deleted.count,
        deleteAll,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DELETE_MESSAGES_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to delete messages",
        },
      },
      { status: 400 }
    );
  }
}
