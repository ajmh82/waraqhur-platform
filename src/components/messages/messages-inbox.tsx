"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface InboxThread {
  id: string;
  updatedAt: string;
  unreadCount: number;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
  } | null;
}

export function MessagesInbox() {
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadThreads() {
    try {
      setError(null);
      const response = await fetch("/api/messages", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.error?.message ?? "تعذر تحميل المحادثات.");
        return;
      }

      const list = Array.isArray(payload?.data?.threads) ? payload.data.threads : [];
      setThreads(list);
    } catch {
      setError("تعذر تحميل المحادثات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 20000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    return [...threads].sort((a, b) => {
      const ua = Number(a.unreadCount || 0);
      const ub = Number(b.unreadCount || 0);
      if (ub !== ua) return ub - ua;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [threads]);

  if (loading) {
    return <div className="state-card">جارٍ تحميل المحادثات...</div>;
  }

  if (error) {
    return <div className="state-card" style={{ color: "#f87171" }}>{error}</div>;
  }

  if (sorted.length === 0) {
    return (
      <div className="state-card" style={{ display: "grid", gap: 8 }}>
        <strong>لا توجد محادثات بعد</strong>
        <span style={{ opacity: 0.8 }}>ابدأ محادثة من ملف أي مستخدم عبر زر المراسلة الخاصة.</span>
      </div>
    );
  }

  return (
    <div className="state-card" style={{ display: "grid", gap: 10 }}>
      {sorted.map((thread) => (
        <Link
          key={thread.id}
          href={`/messages/${thread.id}`}
          className="messages-inbox__item"
        >
          <div className="messages-inbox__main">
            <div className="messages-inbox__name-row">
              <strong>{thread.otherUser.displayName}</strong>
              {thread.unreadCount > 0 ? (
                <span className="messages-inbox__badge">
                  {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                </span>
              ) : null}
            </div>
            <span className="messages-inbox__handle">@{thread.otherUser.username}</span>
            <p className="messages-inbox__last">
              {thread.lastMessage?.body?.trim() || "لا توجد رسالة بعد"}
            </p>
          </div>
          <time className="messages-inbox__time">
            {new Date(thread.updatedAt).toLocaleString()}
          </time>
        </Link>
      ))}
    </div>
  );
}
