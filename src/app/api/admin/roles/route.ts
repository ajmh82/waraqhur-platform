import { apiError, apiSuccess } from "@/lib/api-response";
import { requirePermission } from "@/lib/api-guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const guard = await requirePermission("users.manage");

  if (!guard.ok) {
    return apiError(guard.code, guard.message, guard.status);
  }

  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return apiSuccess({
      data: {
        roles: roles.map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          usersCount: role.userRoles.length,
          permissions: role.rolePermissions
            .map((entry) => entry.permission.key)
            .sort(),
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    return apiError(
      "ADMIN_ROLES_LIST_FAILED",
      error instanceof Error ? error.message : "Failed to load roles",
      400
    );
  }
}
