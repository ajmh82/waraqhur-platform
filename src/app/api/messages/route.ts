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


async function hasBlockRelation(userAId: string, userBId: string) {
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerUserId: userAId, blockedUserId: userBId },
        { blockerUserId: userBId, blockedUserId: userAId },
      ],
    },
    select: { blockerUserId: true },
  });

  return Boolean(row);
}

export async function GET() {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const userId = auth.current.user.id;

    const threads = await prisma.directThread.findMany({
      where: {
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
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const threadIds = threads.map((thread) => thread.id);

    const unreadGrouped =
      threadIds.length > 0
        ? await prisma.directMessage.groupBy({
            by: ["threadId"],
            where: {
              threadId: {
                in: threadIds,
              },
              senderUserId: {
                not: userId,
              },
              readAt: null,
            },
            _count: {
              _all: true,
            },
          })
        : [];

    const unreadMap = new Map(
      unreadGrouped.map((entry) => [entry.threadId, entry._count._all])
    );

    return NextResponse.json({
      success: true,
      data: {
        threads: threads.map((thread) => {
          const otherUser =
            thread.participantAUserId === userId
              ? thread.participantB
              : thread.participantA;

          return {
            id: thread.id,
            updatedAt: thread.updatedAt.toISOString(),
            unreadCount: unreadMap.get(thread.id) ?? 0,
            otherUser: {
              id: otherUser.id,
              username: otherUser.username,
              displayName:
                otherUser.profile?.displayName ?? otherUser.username,
              avatarUrl: otherUser.profile?.avatarUrl ?? null,
            },
            lastMessage: thread.messages[0]
              ? {
                  id: thread.messages[0].id,
                  body: thread.messages[0].body,
                  createdAt: thread.messages[0].createdAt.toISOString(),
                }
              : null,
          };
        }),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_THREADS_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to list threads",
        },
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const currentUserId = auth.current.user.id;
    const body = await request.json();
    const targetUserId =
      typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TARGET_USER_REQUIRED",
            message: "Target user is required",
          },
        },
        { status: 400 }
      );
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SELF_THREAD_NOT_ALLOWED",
            message: "You cannot create a thread with yourself",
          },
        },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Target user not found",
          },
        },
        { status: 404 }
      );
    }


    const blocked = await hasBlockRelation(currentUserId, targetUserId);

    if (blocked) {
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
      currentUserId < targetUserId
        ? [currentUserId, targetUserId]
        : [targetUserId, currentUserId];

    const thread = await prisma.directThread.upsert({
      where: {
        participantAUserId_participantBUserId: {
          participantAUserId,
          participantBUserId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        participantAUserId,
        participantBUserId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        thread: {
          id: thread.id,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CREATE_THREAD_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to create thread",
        },
      },
      { status: 400 }
    );
  }
}
