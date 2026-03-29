import type {
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";

export type NotificationEventKey =
  | "auth.email_verified"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed"
  | "invitation.sent"
  | "invitation.accepted"
  | "invitation.revoked"
  | "role.assigned"
  | "system.announcement"
  | "dm.request.sent"
  | "dm.request.accepted"
  | "dm.request.rejected"
  | "dm.message.received";

export interface NotificationPayload {
  event: NotificationEventKey;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body: string;
  payload: NotificationPayload | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}
