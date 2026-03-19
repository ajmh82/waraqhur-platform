import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import { userHasPermission } from "@/services/authorization-service";

export interface GuardSuccessResult {
  ok: true;
  user: Awaited<ReturnType<typeof getCurrentUserFromSession>>["user"];
}

export interface GuardFailureResult {
  ok: false;
  code: "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_SESSION";
  message: string;
  status: number;
}

export type GuardResult = GuardSuccessResult | GuardFailureResult;

export async function requireAuthenticatedUser(): Promise<GuardResult> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Authentication required",
      status: 401,
    };
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);

    return {
      ok: true,
      user: current.user,
    };
  } catch {
    return {
      ok: false,
      code: "INVALID_SESSION",
      message: "Invalid or expired session",
      status: 401,
    };
  }
}

export async function requirePermission(
  permissionKey: string
): Promise<GuardResult> {
  const authResult = await requireAuthenticatedUser();

  if (!authResult.ok) {
    return authResult;
  }

  const allowed = await userHasPermission(authResult.user.id, permissionKey);

  if (!allowed) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action",
      status: 403,
    };
  }

  return authResult;
}
