import type { UserStatus } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  status: UserStatus;
  profile: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    locale: string | null;
    timezone: string | null;
  } | null;
}

export interface CurrentSession {
  id: string;
  expiresAt: string;
  lastUsedAt: string | null;
}
