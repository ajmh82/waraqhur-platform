import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function validUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value);
}

async function requireUserId() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionValue) return null;
  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return current.user.id;
  } catch {
    return null;
  }
}

async function usernameChangesLastYear(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number | string }>>(
      'SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "actorUserId" = $1 AND "action" = $2 AND "createdAt" >= $3',
      userId,
      "USERNAME_CHANGED",
      cutoff
    );
    const c = Number(rows?.[0]?.count ?? 0);
    return Number.isFinite(c) ? c : 0;
  } catch {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: number | string }>>(
        "SELECT COUNT(*) as count FROM AuditLog WHERE actorUserId = ? AND action = ? AND createdAt >= ?",
        userId,
        "USERNAME_CHANGED",
        cutoff.toISOString()
      );
      const c = Number(rows?.[0]?.count ?? 0);
      return Number.isFinite(c) ? c : 0;
    } catch {
      return 0;
    }
  }
}

async function logUsernameChange(actorUserId: string, metadata: Record<string, unknown>) {
  const now = new Date();
  try {
    await prisma.$queryRawUnsafe(
      'INSERT INTO "AuditLog" ("id","actorUserId","action","metadata","createdAt") VALUES ($1,$2,$3,$4,$5)',
      `ul_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      actorUserId,
      "USERNAME_CHANGED",
      JSON.stringify(metadata),
      now
    );
  } catch {
    try {
      await prisma.$queryRawUnsafe(
        "INSERT INTO AuditLog (id, actorUserId, action, metadata, createdAt) VALUES (?, ?, ?, ?, ?)",
        `ul_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        actorUserId,
        "USERNAME_CHANGED",
        JSON.stringify(metadata),
        now.toISOString()
      );
    } catch {
      // no-op
    }
  }
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login?next=%2Fdashboard%2Faccount", request.url));
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const username = normalizeUsername(String(form.get("username") ?? ""));
  const displayName = String(form.get("displayName") ?? "").trim();

  if (!email || !username || !displayName) {
    return NextResponse.redirect(new URL("/dashboard/account?status=invalid", request.url));
  }

  if (!validUsername(username)) {
    return NextResponse.redirect(new URL("/dashboard/account?status=username_format", request.url));
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!currentUser) {
    return NextResponse.redirect(new URL("/dashboard/account?status=not_found", request.url));
  }

  const usernameChanged = currentUser.username !== username;
  if (usernameChanged) {
    const used = await usernameChangesLastYear(userId);
    if (used >= 2) {
      return NextResponse.redirect(new URL("/dashboard/account?status=username_limit", request.url));
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email,
          username,
        },
      });

      await tx.profile.upsert({
        where: { userId },
        update: { displayName },
        create: {
          userId,
          displayName,
          locale: "ar",
        },
      });
    });

    if (usernameChanged) {
      await logUsernameChange(userId, {
        from: currentUser.username,
        to: username,
      });
    }

    return NextResponse.redirect(new URL("/dashboard/account?status=saved", request.url));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.redirect(new URL("/dashboard/account?status=duplicate", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/account?status=failed", request.url));
  }
}
