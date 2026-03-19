import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { listNotificationsForUser } from "@/services/notification-service";

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const notifications = await listNotificationsForUser(current.user.id);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SESSION",
          message: "Invalid or expired session",
        },
      },
      { status: 401 }
    );
  }
}
