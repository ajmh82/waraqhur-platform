"use client";

import { useState, useTransition } from "react";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
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
  },
} as const;

export function NotificationsManager({
  locale = "ar",
  initialItems,
}: NotificationsManagerProps) {
  const t = copy[locale];
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
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
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )
    );
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
    });
  }

  const unreadCount = items.filter((item) => !item.readAt).length;

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
          {items.map((n) => (
            <article
              key={n.id}
              className="dashboard-card"
              style={{
                padding: "16px",
                display: "grid",
                gap: "8px",
                border: n.readAt
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(125,211,252,0.28)",
                background: n.readAt
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(56,189,248,0.08)",
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

              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>
                {n.body || t.unknownBody}
              </p>

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

                {!n.readAt ? (
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => markOneAsRead(n.id)}
                  >
                    {t.markRead}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
