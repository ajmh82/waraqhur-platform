import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import {
  createSessionExpiryDate,
  generateSessionToken,
  hashSessionToken,
  signSessionValue,
  verifySignedSessionValue,
} from "@/lib/auth-session";
import type { AuthenticatedUser } from "@/types/auth";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "@/services/auth-schemas";
import { assignRoleToUser } from "@/services/authorization-service";

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function mapAuthenticatedUser(
  user: Prisma.UserGetPayload<{
    include: {
      profile: true;
    };
  }>
): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    status: user.status,
    profile: user.profile
      ? {
          displayName: user.profile.displayName,
          bio: user.profile.bio,
          avatarUrl: user.profile.avatarUrl,
          locale: user.profile.locale,
          timezone: user.profile.timezone,
        }
      : null,
  };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }],
    },
  });

  if (existingUser) {
    throw new Error("A user with this email or username already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      status: "ACTIVE",
      profile: {
        create: {
          displayName: input.displayName,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  await assignRoleToUser({
    userId: user.id,
    roleKey: "member",
  });

  return mapAuthenticatedUser(user);
}

export async function loginUser(input: LoginInput, meta?: { ipAddress?: string | null; userAgent?: string | null }) {
  const loginValue = input.email.trim();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: loginValue, mode: "insensitive" } },
        { username: { equals: loginValue, mode: "insensitive" } },
      ],
    },
    include: {
      profile: true,
    },
  });

  if (!user?.passwordHash) {
    throw new Error("Invalid email/username or password");
  }

  if (!user.emailVerifiedAt) {
    throw new Error("Please verify your email before logging in");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("Invalid email/username or password");
  }

  const rawSessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(rawSessionToken);
  const expiresAt = createSessionExpiryDate();

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: sessionTokenHash,
      expiresAt,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
      lastUsedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const signedSessionValue = await signSessionValue({
    sessionId: session.id,
    userId: user.id,
    token: rawSessionToken,
    expiresAt,
  });

  return {
    sessionValue: signedSessionValue,
    expiresAt,
    user: mapAuthenticatedUser(user),
  };
}

export async function getCurrentUserFromSession(sessionValue: string) {
  const verified = await verifySignedSessionValue(sessionValue);
  const tokenHash = hashSessionToken(verified.token);

  const session = await prisma.userSession.findFirst({
    where: {
      id: verified.sessionId,
      userId: verified.userId,
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error("Invalid session");
  }

  await prisma.userSession.update({
    where: {
      id: session.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return {
    user: mapAuthenticatedUser(session.user),
    session: {
      id: session.id,
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
    },
  };
}

export async function logoutUserSession(sessionValue: string) {
  const verified = await verifySignedSessionValue(sessionValue);
  const tokenHash = hashSessionToken(verified.token);

  const session = await prisma.userSession.findFirst({
    where: {
      id: verified.sessionId,
      userId: verified.userId,
      tokenHash,
      revokedAt: null,
    },
  });

  if (!session) {
    return;
  }

  await prisma.userSession.update({
    where: {
      id: session.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function updateCurrentUserProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      profile: {
        upsert: {
          create: {
            displayName: input.displayName,
            bio: normalizeNullableString(input.bio),
            avatarUrl: normalizeNullableString(input.avatarUrl),
            locale: normalizeNullableString(input.locale),
            timezone: normalizeNullableString(input.timezone),
          },
          update: {
            displayName: input.displayName,
            bio: normalizeNullableString(input.bio),
            avatarUrl: normalizeNullableString(input.avatarUrl),
            locale: normalizeNullableString(input.locale),
            timezone: normalizeNullableString(input.timezone),
          },
        },
      },
    },
    include: {
      profile: true,
    },
  });

  return mapAuthenticatedUser(user);
}
