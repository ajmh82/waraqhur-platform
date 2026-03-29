import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import {
  STORY_ALLOWED_PRIVACY,
  STORY_ALLOWED_TYPES,
  STORY_CAPTION_MAX,
  STORY_EXPIRES_HOURS,
  STORY_IMAGE_DEFAULT_SECONDS,
  STORY_TEXT_MAX,
  STORY_VIDEO_DEFAULT_SECONDS,
  STORY_VIDEO_MAX_SECONDS,
  storyExpiresAtFromNow,
} from "@/lib/story-constants";

async function requireSessionUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionValue) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
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
        { success: false, error: { code: "INVALID_SESSION", message: "Invalid session" } },
        { status: 401 }
      ),
    };
  }
}

const CreateStorySchema = z.object({
  type: z.enum(STORY_ALLOWED_TYPES).default("IMAGE"),
  mediaUrl: z.string().trim().min(1).optional(),
  thumbnailUrl: z.string().trim().optional().nullable(),
  textContent: z.string().trim().max(STORY_TEXT_MAX).optional().nullable(),
  backgroundStyle: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .default("linear-gradient(135deg,#1f2937,#111827)"),
  caption: z.string().trim().max(STORY_CAPTION_MAX).optional().nullable(),
  privacy: z.enum(STORY_ALLOWED_PRIVACY).default("AUTHENTICATED"),
  durationSeconds: z.number().int().min(1).max(STORY_VIDEO_MAX_SECONDS).optional(),
});

export async function GET(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const includeExpired = url.searchParams.get("includeExpired") === "1";
  const includeDeleted = url.searchParams.get("includeDeleted") === "1";
  const onlyMine = url.searchParams.get("mine") !== "0";
  const userId = auth.current.user.id;

  const where = {
    ...(onlyMine ? { authorUserId: userId } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(includeExpired ? {} : { expiresAt: { gt: new Date() } }),
  };

  const stories = await prisma.story.findMany({
    where,
    include: {
      author: { include: { profile: true } },
      _count: { select: { views: true } },
      views: {
        where: { viewerUserId: userId },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({
    success: true,
    data: {
      stories: stories.map((s) => ({
        id: s.id,
        type: s.type,
        mediaUrl: s.mediaUrl,
        thumbnailUrl: s.thumbnailUrl,
        textContent: s.textContent,
        backgroundStyle: s.backgroundStyle,
        caption: s.caption,
        durationSeconds: s.durationSeconds,
        privacy: s.privacy,
        sortOrder: s.sortOrder,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isSeen: s.views.length > 0,
        viewCount: s._count.views,
        author: {
          id: s.author.id,
          username: s.author.username,
          displayName: s.author.profile?.displayName ?? s.author.username,
          avatarUrl: s.author.profile?.avatarUrl ?? null,
        },
      })),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if (!auth.ok) return auth.response;

  const userId = auth.current.user.id;
  const json = await request.json().catch(() => ({}));
  const parsed = CreateStorySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" } },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const type = payload.type;

  if (type === "TEXT" && !payload.textContent) {
    return NextResponse.json(
      { success: false, error: { code: "TEXT_REQUIRED", message: "textContent is required for text story" } },
      { status: 400 }
    );
  }

  if (type !== "TEXT" && !payload.mediaUrl) {
    return NextResponse.json(
      { success: false, error: { code: "MEDIA_REQUIRED", message: "mediaUrl is required for media stories" } },
      { status: 400 }
    );
  }

  let durationSeconds = payload.durationSeconds;
  if (!durationSeconds) {
    durationSeconds = type === "VIDEO" ? STORY_VIDEO_DEFAULT_SECONDS : STORY_IMAGE_DEFAULT_SECONDS;
  }
  if (type !== "VIDEO") {
    durationSeconds = Math.min(durationSeconds, STORY_IMAGE_DEFAULT_SECONDS);
  }

  const maxSort = await prisma.story.aggregate({
    where: { authorUserId: userId, deletedAt: null, expiresAt: { gt: new Date() } },
    _max: { sortOrder: true },
  });

  const created = await prisma.story.create({
    data: {
      authorUserId: userId,
      type,
      mediaUrl: payload.mediaUrl ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      textContent: payload.textContent ?? null,
      backgroundStyle: payload.backgroundStyle ?? null,
      caption: payload.caption ?? null,
      privacy: payload.privacy,
      durationSeconds,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      expiresAt: storyExpiresAtFromNow(),
    },
    include: {
      author: { include: { profile: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: created.id,
      type: created.type,
      mediaUrl: created.mediaUrl,
      thumbnailUrl: created.thumbnailUrl,
      textContent: created.textContent,
      backgroundStyle: created.backgroundStyle,
      caption: created.caption,
      privacy: created.privacy,
      durationSeconds: created.durationSeconds,
      sortOrder: created.sortOrder,
      createdAt: created.createdAt.toISOString(),
      expiresAt: created.expiresAt.toISOString(),
      expiresInHours: STORY_EXPIRES_HOURS,
      author: {
        id: created.author.id,
        username: created.author.username,
        displayName: created.author.profile?.displayName ?? created.author.username,
        avatarUrl: created.author.profile?.avatarUrl ?? null,
      },
    },
  });
}
