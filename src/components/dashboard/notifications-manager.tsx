"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface NotificationItemPayload {
  event?: string | null;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  payload?: NotificationItemPayload | null;
}

interface NotificationsManagerProps {
  locale?: "ar" | "en";
  initialItems: NotificationItem[];
}

const copy = {
  ar: {
    empty: "لا توجد إشعارات حتى الآن.",
    unread: "غير مقروء",
    read: "مقروء",
    unknownTitle: "إشعار",
    unknownBody: "لا يوجد محتوى للإشعار.",
    createdAt: "وقت الإنشاء",
    markRead: "تعليم كمقروء",
    markAll: "تعليم الكل كمقروء",
    markingAll: "جارٍ التعليم...",
    actionFailed: "تعذر تنفيذ العملية.",
    open: "فتح",
    accept: "قبول",
    reject: "رفض",
    processing: "جارٍ التنفيذ...",
  },
  en: {
    empty: "No notifications yet.",
    unread: "Unread",
    read: "Read",
    unknownTitle: "Notification",
    unknownBody: "No notification content.",
    createdAt: "Created At",
    markRead: "Mark as read",
    markAll: "Mark all as read",
    markingAll: "Marking...",
    actionFailed: "Action failed.",
    open: "Open",
    accept: "Accept",
    reject: "Reject",
    processing: "Processing...",
  },
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getNotificationTargetUrl(item: NotificationItem): string | null {
  const payload = item.payload;
  const metadata = asRecord(payload?.metadata);
  const event = asString(payload?.event) ?? asString(item.type);
  const actionUrl = asString(payload?.actionUrl);

  if (actionUrl) return actionUrl;

  const postSlug = asString(metadata?.postSlug);
  const postId = asString(metadata?.postId);
  const commentId = asString(metadata?.commentId);
  const threadId = asString(metadata?.threadId);

  if (event === "post.replied" || event === "comment.replied") {
    const postPath = postSlug
      ? `/posts/${encodeURIComponent(postSlug)}`
      : postId
        ? `/posts/${postId}`
        : null;
    if (!postPath) return null;
    return commentId ? `${postPath}#comment-${commentId}` : postPath;
  }

  if (
    event === "post.liked" ||
    event === "post.reposted" ||
    event === "post.bookmarked"
  ) {
    if (postSlug) return `/posts/${encodeURIComponent(postSlug)}`;
    if (postId) return `/posts/${postId}`;
    return null;
  }

  if (event === "dm.request.accepted" && threadId) {
    return `/messages/${threadId}`;
  }

  if (event === "dm.request.sent" || event === "dm.request.rejected") {
    return "/messages";
  }

  return null;
}

function getDmRequestId(item: NotificationItem): string | null {
  const metadata = asRecord(item.payload?.metadata);
  return asString(metadata?.requestId) ?? asString(item.payload?.entityId);
}

function getDmRequesterUsername(item: NotificationItem): string | null {
  const metadata = asRecord(item.payload?.metadata);
  return asString(metadata?.requesterUsername);
}

export function NotificationsManager({
  locale = "ar",
  initialItems,
}: NotificationsManagerProps) {
  const router = useRouter();
  const t = copy[locale];
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function markOneAsRead(notificationId: string) {
    setError(null);

    const response = await fetch("/api/notifications/read", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setError(payload?.error?.message ?? t.actionFailed);
      return false;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("notifications:changed"));
    }

    return true;
  }

  async function markAllAsRead() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.actionFailed);
        return;
      }

      const nowIso = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: nowIso })));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:changed"));
      }
    });
  }

  const unreadCount = items.filter((item) => !item.readAt).length;

  async function openNotification(item: NotificationItem) {
    setError(null);
    const targetUrl = getNotificationTargetUrl(item);
    if (!targetUrl) return;

    if (!item.readAt) {
      const ok = await markOneAsRead(item.id);
      if (!ok) return;
    }

    router.push(targetUrl);
  }

  async function handleRequestAction(
    item: NotificationItem,
    action: "accept" | "reject"
  ) {
    const requestId = getDmRequestId(item);
    if (!requestId) {
      setError(t.actionFailed);
      return;
    }

    setError(null);
    setActionId(`${item.id}:${action}`);
    try {
      const response = await fetch(`/api/messages/requests/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? t.actionFailed);
        return;
      }

      const nowIso = new Date().toISOString();
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, readAt: nowIso } : entry
        )
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("notifications:changed"));
      }

      if (action === "accept" && typeof payload?.data?.thread?.id === "string") {
        router.push(`/messages/${payload.data.thread.id}`);
        return;
      }
    } finally {
      setActionId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>
          {unreadCount > 0 ? `${unreadCount} ${t.unread}` : t.read}
        </span>

        <button
          type="button"
          className="btn small"
          onClick={markAllAsRead}
          disabled={isPending || unreadCount === 0}
        >
          {isPending ? t.markingAll : t.markAll}
        </button>
      </div>

      {error ? (
        <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p>
      ) : null}

      {items.length === 0 ? (
        <div className="dashboard-card" style={{ padding: "18px", color: "var(--muted)" }}>
          {t.empty}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {items.map((n) => {
            const targetUrl = getNotificationTargetUrl(n);
            const isDmRequest = (n.payload?.event ?? n.type) === "dm.request.sent";
            const requestActionBusy = actionId === `${n.id}:accept` || actionId === `${n.id}:reject`;
            const requesterUsername = getDmRequesterUsername(n);

            return (
              <article
                key={n.id}
                className="dashboard-card"
                style={{
                  padding: "14px 0",
                  display: "grid",
                  gap: "8px",
                  border: 0,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 0,
                  background: "transparent",
                  boxShadow: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ fontSize: "15px" }}>{n.title || t.unknownTitle}</strong>
                  <span
                    style={{
                      fontSize: "12px",
                      color: n.readAt ? "var(--muted)" : "#7dd3fc",
                      fontWeight: 700,
                    }}
                  >
                    {n.readAt ? t.read : t.unread}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void openNotification(n)}
                  disabled={!targetUrl}
                  style={{
                    textAlign: "start",
                    margin: 0,
                    color: "var(--muted)",
                    lineHeight: 1.8,
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    cursor: targetUrl ? "pointer" : "default",
                    opacity: targetUrl ? 1 : 0.9,
                  }}
                >
                  {isDmRequest && requesterUsername
                    ? locale === "en"
                      ? `@${requesterUsername} sent you a new chat request.`
                      : `@${requesterUsername} أرسل لك طلب محادثة جديدة.`
                    : n.body || t.unknownBody}
                </button>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {t.createdAt}:{" "}
                    {formatDateTimeInMakkah(
                      n.createdAt,
                      locale === "en" ? "en-US" : "ar-BH"
                    )}
                  </span>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {isDmRequest ? (
                      <>
                        <button
                          type="button"
                          className="btn small"
                          disabled={requestActionBusy}
                          onClick={() => void handleRequestAction(n, "accept")}
                        >
                          {requestActionBusy ? t.processing : t.accept}
                        </button>
                        <button
                          type="button"
                          className="btn small"
                          disabled={requestActionBusy}
                          onClick={() => void handleRequestAction(n, "reject")}
                        >
                          {requestActionBusy ? t.processing : t.reject}
                        </button>
                      </>
                    ) : null}

                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
