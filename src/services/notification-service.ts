import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  NotificationItem,
  NotificationPayload,
} from "@/types/notification";

function mapNotification(
  notification: Prisma.NotificationGetPayload<Record<string, never>>
): NotificationItem {
  return {
    id: notification.id,
    userId: notification.userId,
    channel: notification.channel,
    status: notification.status,
    title: notification.title,
    body: notification.body,
    payload: (notification.payload as NotificationPayload | null) ?? null,
    sentAt: notification.sentAt?.toISOString() ?? null,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}

export async function createInAppNotification(input: {
  userId: string;
  title: string;
  body: string;
  payload: NotificationPayload;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      title: input.title,
      body: input.body,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      sentAt: new Date(),
    },
  });

  return mapNotification(notification);
}

export async function listNotificationsForUser(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      channel: NotificationChannel.IN_APP,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notifications.map(mapNotification);
}

export async function markNotificationAsRead(input: {
  userId: string;
  notificationId: string;
}) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: input.notificationId,
      userId: input.userId,
      channel: NotificationChannel.IN_APP,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  const updatedNotification = await prisma.notification.update({
    where: {
      id: notification.id,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: notification.readAt ?? new Date(),
    },
  });

  return mapNotification(updatedNotification);
}

export async function markAllNotificationsAsRead(userId: string) {
  const now = new Date();

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      channel: NotificationChannel.IN_APP,
      readAt: null,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: now,
    },
  });

  return {
    success: true,
    updatedCount: result.count,
    readAt: now.toISOString(),
  };
}
