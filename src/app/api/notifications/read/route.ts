import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { markNotificationAsReadSchema } from "@/services/notification-schemas";
import { markNotificationAsRead } from "@/services/notification-service";

export async function POST(request: Request) {
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
    const body = await request.json();
    const input = markNotificationAsReadSchema.parse(body);
    const notification = await markNotificationAsRead({
      userId: current.user.id,
      notificationId: input.notificationId,
    });

    return NextResponse.json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid mark-as-read payload",
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
          code: "NOTIFICATION_READ_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Notification mark-as-read failed",
        },
      },
      { status: 400 }
    );
  }
}
