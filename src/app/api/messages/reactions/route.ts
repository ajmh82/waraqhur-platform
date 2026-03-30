import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";

type ReactionRow = {
  id: string;
  messageId: string;
  emoji: string;
  userId: string;
};

const ALLOWED_EMOJI = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;

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

async function ensureReactionTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DirectMessageReaction" (
      "id" TEXT PRIMARY KEY,
      "messageId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "emoji" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DirectMessageReaction_message_fk"
        FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE,
      CONSTRAINT "DirectMessageReaction_user_fk"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DirectMessageReaction_message_idx"
    ON "DirectMessageReaction"("messageId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "DirectMessageReaction_user_message_idx"
    ON "DirectMessageReaction"("userId","messageId");
  `);
}

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  try {
    await ensureReactionTable();

    const { searchParams } = new URL(request.url);
    const raw = searchParams.getAll("messageId");
    const messageIds = raw.map((x) => x.trim()).filter(Boolean);

    if (messageIds.length === 0) {
      return NextResponse.json({ success: true, data: { reactions: [] } });
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT r."id", r."messageId", r."emoji", r."userId"
      FROM "DirectMessageReaction" r
      JOIN "DirectMessage" dm ON dm."id" = r."messageId"
      JOIN "DirectThread" dt ON dt."id" = dm."threadId"
      WHERE r."messageId" = ANY($1::text[])
        AND (dt."participantAUserId" = $2 OR dt."participantBUserId" = $2)
      ORDER BY r."createdAt" ASC
      `,
      messageIds,
      auth.current.user.id
    )) as ReactionRow[];

    return NextResponse.json({
      success: true,
      data: { reactions: rows },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REACTIONS_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Failed to load reactions",
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
    await ensureReactionTable();

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
    const emoji = typeof body.emoji === "string" ? body.emoji.trim() : "";

    if (!messageId || !emoji) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "messageId and emoji are required" },
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_EMOJI.includes(emoji as (typeof ALLOWED_EMOJI)[number])) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_EMOJI", message: "Unsupported emoji reaction" },
        },
        { status: 400 }
      );
    }

    const membership = await prisma.$queryRawUnsafe<{ ok: number }[]>(
      `
      SELECT 1 as ok
      FROM "DirectMessage" dm
      JOIN "DirectThread" dt ON dt."id" = dm."threadId"
      WHERE dm."id" = $1
        AND (dt."participantAUserId" = $2 OR dt."participantBUserId" = $2)
      LIMIT 1
      `,
      messageId,
      auth.current.user.id
    );

    if (!membership.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "You cannot react to this message" },
        },
        { status: 403 }
      );
    }

    const existingRows = (await prisma.$queryRawUnsafe(
      `
      SELECT "id", "messageId", "emoji", "userId"
      FROM "DirectMessageReaction"
      WHERE "messageId" = $1 AND "userId" = $2
      `,
      messageId,
      auth.current.user.id
    )) as ReactionRow[];

    const hasSameEmoji = existingRows.some((row) => row.emoji === emoji);

    if (hasSameEmoji) {
      await prisma.$executeRawUnsafe(
        `
        DELETE FROM "DirectMessageReaction"
        WHERE "messageId" = $1 AND "userId" = $2
        `,
        messageId,
        auth.current.user.id
      );

      return NextResponse.json({
        success: true,
        data: { toggled: "removed" },
      });
    }

    if (existingRows.length > 0) {
      await prisma.$executeRawUnsafe(
        `
        DELETE FROM "DirectMessageReaction"
        WHERE "messageId" = $1 AND "userId" = $2
        `,
        messageId,
        auth.current.user.id
      );
    }

    const reactionId = `dmr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "DirectMessageReaction" ("id","messageId","userId","emoji")
      VALUES ($1,$2,$3,$4)
      `,
      reactionId,
      messageId,
      auth.current.user.id,
      emoji
    );

    return NextResponse.json({
      success: true,
      data: { toggled: "added" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "REACTION_TOGGLE_FAILED",
          message: error instanceof Error ? error.message : "Failed to toggle reaction",
        },
      },
      { status: 400 }
    );
  }
}
