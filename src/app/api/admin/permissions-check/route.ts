import { cookies } from "next/headers";
import { apiError, apiSuccess } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getCurrentUserFromSession } from "@/services/auth-service";
import {
  getAuthorizationSnapshotForUser,
  userHasPermission,
} from "@/services/authorization-service";

export async function GET() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionValue) {
    return apiError("UNAUTHENTICATED", "Authentication required", 401);
  }

  try {
    const current = await getCurrentUserFromSession(sessionValue);
    const canManageUsers = await userHasPermission(
      current.user.id,
      "users.manage"
    );

    if (!canManageUsers) {
      return apiError("FORBIDDEN", "You do not have permission to access this endpoint", 403);
    }

    const authorization = await getAuthorizationSnapshotForUser(
      current.user.id
    );

    return apiSuccess({
      data: {
        user: current.user,
        authorization,
      },
    });
  } catch {
    return apiError("INVALID_SESSION", "Invalid or expired session", 401);
  }
}
