"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/date-time";

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

interface OutgoingPendingRequest {
  id: string;
  target: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface MessagesInboxProps {
  locale?: "ar" | "en";
  threads?: InboxThread[];
}

type MessagesFilter = "all" | "incoming_unread" | "outgoing_pending";

const copy = {
  ar: {
    loading: "جارٍ تحميل المحادثات...",
    loadFailed: "تعذر تحميل المحادثات.",
    authRequired: "يجب تسجيل الدخول لعرض المحادثات.",
    emptyTitle: "لا توجد محادثات بعد",
    emptyBody: "ابدأ محادثة جديدة من صندوق (محادثة جديدة) بالأعلى.",
    noMessage: "لا توجد رسالة بعد",
    imageMessage: "صورة",
    deleteThread: "حذف",
    deleting: "جارٍ الحذف...",
    deleteFailed: "تعذر حذف المحادثة.",
    confirmDeleteThread: "هل أنت متأكد من حذف هذه المحادثة بالكامل؟",
    unreadFilterEmpty: "لا توجد رسائل غير مقروءة.",
    outgoingFilterEmpty: "لا توجد طلبات صادرة معلقة مرتبطة بمحادثات.",
  },
  en: {
    loading: "Loading conversations...",
    loadFailed: "Failed to load conversations.",
    authRequired: "You need to sign in to view conversations.",
    emptyTitle: "No conversations yet",
    emptyBody: "Start a new chat from the New Chat box above.",
    noMessage: "No messages yet",
    imageMessage: "Image",
    deleteThread: "Delete",
    deleting: "Deleting...",
    deleteFailed: "Failed to delete conversation.",
    confirmDeleteThread: "Are you sure you want to delete this conversation?",
    unreadFilterEmpty: "No unread conversations.",
    outgoingFilterEmpty: "No pending outgoing requests linked to conversations.",
  },
} as const;

function getRelative(value: string, locale: "ar" | "en") {
  return formatRelativeTime(value, locale === "en" ? "en-US" : "ar-BH");
}

function cleanLastMessagePreview(raw: string, locale: "ar" | "en") {
  if (!raw) return "";

  let text = raw.trim();

  if (text.startsWith("[[waraqhur-reply-meta]]")) {
    const firstLineBreak = text.indexOf("\n");
    if (firstLineBreak >= 0) {
      text = text.slice(firstLineBreak + 1).trim();
    } else {
      text = "";
    }
  }

  if (text === "[image]") {
    return copy[locale].imageMessage;
  }

  return text;
}

export function MessagesInbox({ locale = "ar", threads: initialThreads = [] }: MessagesInboxProps) {
  const t = copy[locale];

  const [threads, setThreads] = useState<InboxThread[]>(
    Array.isArray(initialThreads) ? initialThreads : []
  );
  const [outgoingPendingTargetIds, setOutgoingPendingTargetIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<MessagesFilter>("all");
  const [loading, setLoading] = useState(Array.isArray(initialThreads) ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeTick((v) => v + 1);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onFilterChanged(event: Event) {
      const custom = event as CustomEvent<{ filter?: MessagesFilter }>;
      const next = custom.detail?.filter ?? "all";
      setActiveFilter(next);
    }

    window.addEventListener("messages:filter-changed", onFilterChanged as EventListener);
    return () =>
      window.removeEventListener("messages:filter-changed", onFilterChanged as EventListener);
  }, []);

  useEffect(() => {
    if (isUnauthorized) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchThreads() {
      try {
        setError(null);

        const [threadsRes, outgoingRes] = await Promise.all([
          fetch("/api/messages", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          fetch("/api/messages/requests?box=outgoing&status=PENDING", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const threadsPayload = await threadsRes.json().catch(() => null);
        const outgoingPayload = await outgoingRes.json().catch(() => null);

        if (cancelled) return;

        if (threadsRes.status === 401 || outgoingRes.status === 401) {
          setIsUnauthorized(true);
          setError(t.authRequired);
          return;
        }

        if (!threadsRes.ok || !threadsPayload?.success) {
          setError(threadsPayload?.error?.message ?? t.loadFailed);
          return;
        }

        if (!outgoingRes.ok || !outgoingPayload?.success) {
          setError(outgoingPayload?.error?.message ?? t.loadFailed);
          return;
        }

        const threadList = Array.isArray(threadsPayload?.data?.threads)
          ? (threadsPayload.data.threads as InboxThread[])
          : [];
        setThreads(threadList);

        const outgoingRows = Array.isArray(outgoingPayload?.data?.requests)
          ? (outgoingPayload.data.requests as OutgoingPendingRequest[])
          : [];

        const targetIds = outgoingRows
          .map((row) => row.target?.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        setOutgoingPendingTargetIds(targetIds);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("messages:changed"));
        }
      } catch {
        if (cancelled) return;
        setError(t.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchThreads();

    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchThreads();
    }, 5000);

    const onFocus = () => void fetchThreads();
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchThreads();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isUnauthorized, t.authRequired, t.loadFailed]);

  const sorted = useMemo(() => {
    const base = [...threads].sort((a, b) => {
      const ua = Number(a.unreadCount || 0);
      const ub = Number(b.unreadCount || 0);
      if (ub !== ua) return ub - ua;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    if (activeFilter === "incoming_unread") {
      return base.filter((thread) => Number(thread.unreadCount || 0) > 0);
    }

    if (activeFilter === "outgoing_pending") {
      const targetSet = new Set(outgoingPendingTargetIds);
      return base.filter((thread) => targetSet.has(thread.otherUser.id));
    }

    return base;
  }, [threads, activeFilter, outgoingPendingTargetIds]);

  async function requestDeleteThread(threadId: string) {
    const response = await fetch(`/api/messages/${threadId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteAll: true }),
    });

    const payload = await response.json().catch(() => null);

    if (response.status === 401) {
      setIsUnauthorized(true);
      setError(t.authRequired);
      return false;
    }

    if (!response.ok || !payload?.success) {
      return false;
    }

    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    return true;
  }

  async function deleteSingleThread(threadId: string) {
    if (deletingThreadId) return;

    const confirmed = window.confirm(t.confirmDeleteThread);
    if (!confirmed) return;

    setDeletingThreadId(threadId);
    setError(null);

    try {
      const ok = await requestDeleteThread(threadId);
      if (!ok && !isUnauthorized) {
        setError(t.deleteFailed);
      }
    } catch {
      if (!isUnauthorized) {
        setError(t.deleteFailed);
      }
    } finally {
      setDeletingThreadId(null);
    }
  }

  if (loading) {
    return <div className="state-card">{t.loading}</div>;
  }

  if (error) {
    return (
      <div className="state-card" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  }

  if (sorted.length === 0) {
    if (activeFilter === "incoming_unread") {
      return <div className="state-card">{t.unreadFilterEmpty}</div>;
    }
    if (activeFilter === "outgoing_pending") {
      return <div className="state-card">{t.outgoingFilterEmpty}</div>;
    }

    return (
      <div className="state-card" style={{ display: "grid", gap: 8 }}>
        <strong>{t.emptyTitle}</strong>
        <span style={{ opacity: 0.8 }}>{t.emptyBody}</span>
      </div>
    );
  }

  return (
    <div className="state-card" style={{ display: "grid", gap: 10 }}>
      {sorted.map((thread) => {
        const cleaned = cleanLastMessagePreview(thread.lastMessage?.body ?? "", locale);
        const lastText = cleaned || t.noMessage;
        const lastTimeSource = thread.lastMessage?.createdAt || thread.updatedAt;

        return (
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
            <Link
              href={`/messages/${thread.id}`}
              className="messages-inbox__main"
              style={{
                minWidth: 0,
                display: "grid",
                gap: "3px",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <div className="messages-inbox__name-row" style={{ textDecoration: "none" }}>
                <strong style={{ textDecoration: "none" }}>{thread.otherUser.displayName}</strong>
                {thread.unreadCount > 0 ? (
                  <span className="messages-inbox__badge">
                    {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                  </span>
                ) : null}
              </div>

              <p
                className="messages-inbox__last"
                style={{
                  margin: 0,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lastText}
              </p>

              <time
                className="messages-inbox__time"
                style={{ fontSize: "12px", color: "var(--muted)", textDecoration: "none" }}
              >
                {getRelative(lastTimeSource, locale)}
              </time>

              <span style={{ display: "none" }}>{timeTick}</span>
            </Link>

            <button
              type="button"
              className="btn small"
              disabled={Boolean(deletingThreadId)}
              onClick={() => deleteSingleThread(thread.id)}
            >
              {deletingThreadId === thread.id ? t.deleting : t.deleteThread}
            </button>
          </div>
        );
      })}
    </div>
  );
}
