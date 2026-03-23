import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true,
          },
          orderBy: {
            assignedAt: "asc",
          },
        },
        sessions: {
          orderBy: {
            lastUsedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return apiSuccess({
      data: {
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          username: user.username,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          profile: user.profile
            ? {
                displayName: user.profile.displayName,
              }
            : null,
          roles: user.userRoles.map((entry) => ({
            key: entry.role.key,
            name: entry.role.name,
            assignedAt: entry.assignedAt.toISOString(),
          })),
          sessions: user.sessions.map((session) => ({
            id: session.id,
            createdAt: session.createdAt.toISOString(),
            lastUsedAt: session.lastUsedAt.toISOString(),
            expiresAt: session.expiresAt.toISOString(),
          })),
          lastActivityAt: user.sessions[0]?.lastUsedAt
            ? user.sessions[0].lastUsedAt.toISOString()
            : null,
        })),
      },
    });
  } catch (error) {
    return apiError(
      "ADMIN_USERS_LIST_FAILED",
      error instanceof Error ? error.message : "Failed to load admin users list",
      400
    );
  }
}
