import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { updateProfileSchema } from "@/services/auth-schemas";
import { getCurrentUserFromSession, updateCurrentUserProfile } from "@/services/auth-service";

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
      sessionValue,
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

  return NextResponse.json({
    success: true,
    data: auth.current,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const input = updateProfileSchema.parse(body);
    const user = await updateCurrentUserProfile(auth.current.user.id, input);

    return NextResponse.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid profile payload",
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
          message: error instanceof Error ? error.message : "Profile update failed",
        },
      },
      { status: 400 }
    );
  }
}
