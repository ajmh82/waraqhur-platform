export interface ApiErrorContract {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessContract<T> {
  success: true;
  data: T;
}

export interface ApiFailureContract {
  success: false;
  error: ApiErrorContract;
}

export type ApiContract<T> = ApiSuccessContract<T> | ApiFailureContract;

export interface BasicUserContract {
  id: string;
  email: string;
  username: string;
  status: string;
}

export interface UserProfileContract {
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  locale?: string | null;
  timezone?: string | null;
}

export interface UserRoleContract {
  key: string;
  name: string;
  assignedAt?: string;
}

export interface AdminUserContract extends BasicUserContract {
  createdAt: string;
  updatedAt: string;
  profile: UserProfileContract | null;
  roles: UserRoleContract[];
  lastActivityAt: string | null;
}

export interface InvitationContract {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  role?: {
    key: string;
    name: string;
  } | null;
}

export interface NotificationContract {
  id: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  createdAt: string;
  sentAt?: string | null;
  readAt?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface CategoryContract {
  id: string;
  name: string;
  slug: string;
}

export interface SourceContract {
  id: string;
  name: string;
  slug: string;
  type?: string;
  url?: string | null;
  category?: CategoryContract | null;
}

export interface PostAuthorContract {
  id: string;
  email: string;
  username: string;
}

export interface PostContract {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content?: string | null;
  createdAt: string;
  commentsCount: number;
  visibility?: string;
  status?: string;
  category: CategoryContract | null;
  source: SourceContract | null;
  author: PostAuthorContract | null;
}

export interface CommentContract {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  status?: string;
  author: PostAuthorContract | null;
}

export interface AuditLogContract {
  id: string;
  actorUserId: string | null;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorUser: BasicUserContract | null;
}

export interface DeepLinkContract {
  entityType: "post" | "category" | "source" | "profile" | "admin";
  slug?: string | null;
  id?: string | null;
  path: string;
}
