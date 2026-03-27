import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";

const updateCurrentUserProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(280).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
  locale: z.enum(["ar", "en"]).optional().default("ar"),
  timezone: z.string().trim().max(100).nullable().optional(),
});

async function recordSessionTouch(userId: string, sessionId: string) {
  try {
    const h = await headers();
    const userAgent = h.get("user-agent") ?? null;
    const country =
      h.get("x-vercel-ip-country") ??
      h.get("cf-ipcountry") ??
      h.get("x-country-code") ??
      null;
    const forwardedFor = h.get("x-forwarded-for") ?? null;

    const metadata = JSON.stringify({
      sessionId,
      client: userAgent,
      country,
      ip: forwardedFor,
      source: "auth_me",
    });

    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "AuditLog" ("id","actorUserId","action","metadata","createdAt") VALUES ($1,$2,$3,$4,$5)',
        `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        "SESSION_TOUCH",
        metadata,
        new Date()
      );
    } catch {
      await prisma.$executeRawUnsafe(
        "INSERT INTO AuditLog (id, actorUserId, action, metadata, createdAt) VALUES (?, ?, ?, ?, ?)",
        `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        "SESSION_TOUCH",
        metadata,
        new Date().toISOString()
      );
    }
  } catch {
    // non-blocking
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

export async function GET() {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  await recordSessionTouch(auth.current.user.id, auth.current.session.id);

  const profile = await prisma.profile.findUnique({
    where: {
      userId: auth.current.user.id,
    },
  });

  const payload = {
    user: {
      id: auth.current.user.id,
      email: auth.current.user.email,
      username: auth.current.user.username,
      status: auth.current.user.status,
      profile: profile
        ? {
            displayName: profile.displayName,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            locale: profile.locale,
            timezone: profile.timezone,
          }
        : null,
    },
    session: {
      id: auth.current.session.id,
      expiresAt: auth.current.session.expiresAt,
      lastUsedAt: auth.current.session.lastUsedAt ?? null,
    },
  };

  return NextResponse.json({
    success: true,
    data: payload,
    user: payload.user,
    session: payload.session,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const input = updateCurrentUserProfileSchema.parse(body);

    const profile = await prisma.profile.upsert({
      where: {
        userId: auth.current.user.id,
      },
      update: {
        displayName: input.displayName,
        bio: input.bio ?? null,
        avatarUrl: input.avatarUrl ?? null,
        locale: input.locale ?? "ar",
        timezone: input.timezone ?? null,
      },
      create: {
        userId: auth.current.user.id,
        displayName: input.displayName,
        bio: input.bio ?? null,
        avatarUrl: input.avatarUrl ?? null,
        locale: input.locale ?? "ar",
        timezone: input.timezone ?? null,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        profile: {
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          locale: profile.locale,
          timezone: profile.timezone,
        },
      },
    });

    response.cookies.set("locale", profile.locale ?? "ar", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile update payload",
            details: error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROFILE_UPDATE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update profile",
        },
      },
      { status: 400 }
    );
  }
}
