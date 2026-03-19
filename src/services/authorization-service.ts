import { prisma } from "@/lib/prisma";

export interface AuthorizationSnapshot {
  userId: string;
  roles: string[];
  permissions: string[];
}

export async function getAuthorizationSnapshotForUser(
  userId: string
): Promise<AuthorizationSnapshot> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const roles = Array.from(new Set(userRoles.map((entry) => entry.role.key)));

  const permissions = Array.from(
    new Set(
      userRoles.flatMap((entry) =>
        entry.role.rolePermissions.map(
          (rolePermission) => rolePermission.permission.key
        )
      )
    )
  );

  return {
    userId,
    roles,
    permissions,
  };
}

export async function userHasRole(
  userId: string,
  roleKey: string
): Promise<boolean> {
  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        key: roleKey,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(role);
}

export async function userHasAnyRole(
  userId: string,
  roleKeys: string[]
): Promise<boolean> {
  if (roleKeys.length === 0) {
    return false;
  }

  const role = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        key: {
          in: roleKeys,
        },
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(role);
}

export async function userHasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const rolePermission = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        rolePermissions: {
          some: {
            permission: {
              key: permissionKey,
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(rolePermission);
}

export async function userHasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  if (permissionKeys.length === 0) {
    return false;
  }

  const rolePermission = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        rolePermissions: {
          some: {
            permission: {
              key: {
                in: permissionKeys,
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(rolePermission);
}

export async function assignRoleToUser(input: {
  userId: string;
  roleKey: string;
  assignedByUserId?: string | null;
}) {
  const role = await prisma.role.findUnique({
    where: {
      key: input.roleKey,
    },
    select: {
      id: true,
      key: true,
      name: true,
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  const userRole = await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: input.userId,
        roleId: role.id,
      },
    },
    update: {
      assignedByUserId: input.assignedByUserId ?? null,
    },
    create: {
      userId: input.userId,
      roleId: role.id,
      assignedByUserId: input.assignedByUserId ?? null,
    },
    include: {
      role: true,
    },
  });

  return {
    id: userRole.id,
    assignedAt: userRole.assignedAt.toISOString(),
    role: {
      key: userRole.role.key,
      name: userRole.role.name,
    },
  };
}

export async function getUserRoles(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
    },
    include: {
      role: true,
    },
    orderBy: {
      assignedAt: "asc",
    },
  });

  return userRoles.map((entry) => ({
    id: entry.id,
    assignedAt: entry.assignedAt.toISOString(),
    role: {
      key: entry.role.key,
      name: entry.role.name,
      description: entry.role.description,
    },
  }));
}
