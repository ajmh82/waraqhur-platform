import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

const DEFAULT_INVITES = 5;

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionValue) return null;
  try {
    const current = await getCurrentUserFromSession(sessionValue);
    return current.user;
  } catch {
    return null;
  }
}

async function ensureQuota(userId: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ quota: number | string }>>(
      'SELECT "inviteQuota" as quota FROM "User" WHERE "id" = $1',
      userId
    );
    const q = Number(rows?.[0]?.quota);
    if (Number.isFinite(q) && q > 0) return q;
  } catch {}

  try {
    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET "inviteQuota" = $1 WHERE "id" = $2 AND ("inviteQuota" IS NULL OR "inviteQuota" < 1)',
      DEFAULT_INVITES,
      userId
    );
    return DEFAULT_INVITES;
  } catch {
    return DEFAULT_INVITES;
  }
}

async function countUsed(userId: string) {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ c: number | string }>>(
      'SELECT COUNT(*)::int as c FROM "Invitation" WHERE "inviterUserId" = $1',
      userId
    );
    return Number(rows?.[0]?.c ?? 0) || 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const total = await ensureQuota(user.id);
  const used = await countUsed(user.id);
  const remaining = Math.max(0, total - used);

  const sent = await prisma.invitation.findMany({
    where: { inviterUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      total,
      remaining,
      sent: sent.map((x) => ({
        id: x.id,
        email: x.email,
        status: x.status,
        createdAt: x.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.redirect(new URL("/dashboard/invites?status=invalid_email", request.url));
  }

  const total = await ensureQuota(user.id);
  const used = await countUsed(user.id);
  const remaining = Math.max(0, total - used);

  if (remaining < 1) {
    return NextResponse.redirect(new URL("/dashboard/invites?status=no_quota", request.url));
  }

  try {
    await prisma.invitation.create({
      data: {
        email,
        inviterUserId: user.id,
        roleId: null,
      },
    });
    return NextResponse.redirect(new URL("/dashboard/invites?status=sent", request.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/invites?status=failed", request.url));
  }
}
