/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const current = await getCurrentUserFromSession(session);

    const sessions = await prisma.userSession.findMany({
      where: { userId: current.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        country: true,
        deviceType: true,
        browserName: true,
        platformName: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        activity: sessions.map((s) => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          lastUsedAt: s.lastUsedAt?.toISOString() ?? null,
          ipAddress: s.ipAddress ?? null,
          country: (s as any).country ?? null,
          deviceType: (s as any).deviceType ?? null,
          browserName: (s as any).browserName ?? null,
          platformName: (s as any).platformName ?? null,
          userAgent: s.userAgent ?? null,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DASHBOARD_ACTIVITY_FAILED",
          message: error instanceof Error ? error.message : "Failed to load activity",
        },
      },
      { status: 400 }
    );
  }
}
