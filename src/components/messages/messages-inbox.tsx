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

interface MessagesInboxProps {
  locale?: "ar" | "en";
  threads?: InboxThread[];
}

export function MessagesInbox({ locale = "ar", threads: initialThreads = [] }: MessagesInboxProps) {
  const isArabic = locale !== "en";

  const [threads, setThreads] = useState<InboxThread[]>(
    Array.isArray(initialThreads) ? initialThreads : []
  );
  const [loading, setLoading] = useState(Array.isArray(initialThreads) ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

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
        setError(
          payload?.error?.message ??
            (isArabic ? "تعذر تحميل المحادثات." : "Failed to load conversations.")
        );
        return;
      }

      const list = Array.isArray(payload?.data?.threads) ? (payload.data.threads as InboxThread[]) : [];
      setThreads(list);
    } catch {
      setError(isArabic ? "تعذر تحميل المحادثات." : "Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteThread(threadId: string) {
    if (deletingThreadId) return;

    const confirmed = window.confirm(
      isArabic
        ? "هل أنت متأكد من حذف هذه المحادثة بالكامل؟"
        : "Are you sure you want to delete this conversation?"
    );
    if (!confirmed) return;

    setDeletingThreadId(threadId);
    setError(null);

    try {
      const response = await fetch(`/api/messages/${threadId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(
          payload?.error?.message ??
            (isArabic ? "تعذر حذف المحادثة." : "Failed to delete conversation.")
        );
        return;
      }

      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch {
      setError(isArabic ? "تعذر حذف المحادثة." : "Failed to delete conversation.");
    } finally {
      setDeletingThreadId(null);
    }
  }

  useEffect(() => {
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
    return <div className="state-card">{isArabic ? "جارٍ تحميل المحادثات..." : "Loading conversations..."}</div>;
  }

  if (error) {
    return (
      <div className="state-card" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="state-card" style={{ display: "grid", gap: 8 }}>
        <strong>{isArabic ? "لا توجد محادثات بعد" : "No conversations yet"}</strong>
        <span style={{ opacity: 0.8 }}>
          {isArabic
            ? "ابدأ محادثة جديدة من صندوق (محادثة جديدة) بالأعلى."
            : "Start a new chat from the New Chat box above."}
        </span>
      </div>
    );
  }

  return (
    <div className="state-card" style={{ display: "grid", gap: 10 }}>
      {sorted.map((thread) => (
        <div
          key={thread.id}
          className="messages-inbox__item"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <Link href={`/messages/${thread.id}`} className="messages-inbox__main" style={{ minWidth: 0 }}>
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
              {thread.lastMessage?.body?.trim() ||
                (isArabic ? "لا توجد رسالة بعد" : "No messages yet")}
            </p>
          </Link>

          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <time className="messages-inbox__time">
              {new Date(thread.updatedAt).toLocaleString(
                isArabic ? "ar-BH" : "en-US",
                { hour12: !isArabic }
              )}
            </time>
            <button
              type="button"
              className="btn small"
              disabled={deletingThreadId === thread.id}
              onClick={() => deleteThread(thread.id)}
            >
              {deletingThreadId === thread.id
                ? isArabic
                  ? "جارٍ الحذف..."
                  : "Deleting..."
                : isArabic
                  ? "حذف"
                  : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
