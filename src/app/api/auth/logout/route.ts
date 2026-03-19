import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { logoutUserSession } from "@/services/auth-service";

export async function POST() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionValue) {
    await logoutUserSession(sessionValue);
  }

  cookieStore.set(
    SESSION_COOKIE_NAME,
    "",
    getSessionCookieOptions(new Date(0))
  );

  return NextResponse.json({
    success: true,
    data: {
      loggedOut: true,
    },
  });
}
