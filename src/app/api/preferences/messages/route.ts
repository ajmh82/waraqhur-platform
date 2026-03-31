import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { prisma } from "@/lib/prisma";

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

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login?next=%2Fdashboard%2Faccount", request.url));
  }

  const form = await request.formData();
  const enabledRaw = form.get("directMessagesEnabled");
  const directMessagesEnabled =
    enabledRaw === "on" || enabledRaw === "true" || enabledRaw === "1";

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { directMessagesEnabled },
    });

    return NextResponse.redirect(new URL("/dashboard/account?status=dm_saved", request.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/account?status=failed", request.url));
  }
}
