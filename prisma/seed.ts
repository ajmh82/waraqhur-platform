import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roleSeeds = [
  {
    key: "member",
    name: "Member",
    description: "Default member with basic access",
    isSystem: true,
  },
  {
    key: "moderator",
    name: "Moderator",
    description: "Moderator with content moderation permissions",
    isSystem: true,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Administrator with advanced management permissions",
    isSystem: true,
  },
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full system access",
    isSystem: true,
  },
] as const;

const permissionSeeds = [
  { key: "profile.read", name: "Read profile", description: "Read current profile data" },
  { key: "profile.update", name: "Update profile", description: "Update own profile" },

  { key: "posts.read", name: "Read posts", description: "Read posts" },
  { key: "posts.create", name: "Create posts", description: "Create posts" },
  { key: "posts.update", name: "Update posts", description: "Update posts" },
  { key: "posts.delete", name: "Delete posts", description: "Delete posts" },
  { key: "posts.publish", name: "Publish posts", description: "Publish posts" },

  { key: "comments.read", name: "Read comments", description: "Read comments" },
  { key: "comments.moderate", name: "Moderate comments", description: "Hide or moderate comments" },

  { key: "categories.read", name: "Read categories", description: "Read categories" },
  { key: "categories.manage", name: "Manage categories", description: "Manage categories" },

  { key: "sources.read", name: "Read sources", description: "Read sources" },
  { key: "sources.manage", name: "Manage sources", description: "Manage sources" },

  { key: "invites.read", name: "Read invites", description: "Read invitations" },
  { key: "invites.create", name: "Create invites", description: "Create invitations" },
  { key: "invites.revoke", name: "Revoke invites", description: "Revoke invitations" },

  { key: "users.read", name: "Read users", description: "Read users" },
  { key: "users.manage", name: "Manage users", description: "Manage users and roles" },

  { key: "roles.read", name: "Read roles", description: "Read roles and permissions" },
  { key: "roles.manage", name: "Manage roles", description: "Manage roles and permissions" },

  { key: "notifications.read", name: "Read notifications", description: "Read notifications" },
  { key: "notifications.manage", name: "Manage notifications", description: "Manage notifications" },

  { key: "audit.read", name: "Read audit logs", description: "Read audit logs" },

  { key: "messages.read_all", name: "Read all messages", description: "Allow reading all users direct messages" },
] as const;

const rolePermissionMap: Record<string, string[]> = {
  member: [
    "profile.read",
    "profile.update",
    "posts.read",
    "comments.read",
    "categories.read",
    "sources.read",
    "notifications.read",
  ],
  moderator: [
    "profile.read",
    "profile.update",
    "posts.read",
    "posts.update",
    "comments.read",
    "comments.moderate",
    "categories.read",
    "sources.read",
    "invites.read",
    "notifications.read",
  ],
  admin: [
    "profile.read",
    "profile.update",
    "posts.read",
    "posts.create",
    "posts.update",
    "posts.delete",
    "posts.publish",
    "comments.read",
    "comments.moderate",
    "categories.read",
    "categories.manage",
    "sources.read",
    "sources.manage",
    "invites.read",
    "invites.create",
    "invites.revoke",
    "users.read",
    "users.manage",
    "roles.read",
    "notifications.read",
    "notifications.manage",
    "audit.read",
    "messages.read_all",
  ],
  super_admin: permissionSeeds.map((permission) => permission.key),
};

async function main() {
  for (const role of roleSeeds) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: role,
    });
  }

  for (const permission of permissionSeeds) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
      },
      create: permission,
    });
  }

  const roles = await prisma.role.findMany();
  const permissions = await prisma.permission.findMany();

  const roleByKey = new Map(roles.map((role) => [role.key, role]));
  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission]));

  for (const [roleKey, permissionKeys] of Object.entries(rolePermissionMap)) {
    const role = roleByKey.get(roleKey);

    if (!role) {
      throw new Error(`Missing role: ${roleKey}`);
    }

    for (const permissionKey of permissionKeys) {
      const permission = permissionByKey.get(permissionKey);

      if (!permission) {
        throw new Error(`Missing permission: ${permissionKey}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        seededRoles: roleSeeds.map((role) => role.key),
        seededPermissions: permissionSeeds.map((permission) => permission.key),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
