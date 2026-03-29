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

const copy = {
  ar: {
    loading: "جارٍ تحميل المحادثات...",
    loadFailed: "تعذر تحميل المحادثات.",
    authRequired: "يجب تسجيل الدخول لعرض المحادثات.",
    emptyTitle: "لا توجد محادثات بعد",
    emptyBody: "ابدأ محادثة جديدة من صندوق (محادثة جديدة) بالأعلى.",
    noMessage: "لا توجد رسالة بعد",
    deleteThread: "حذف",
    deleting: "جارٍ الحذف...",
    deleteFailed: "تعذر حذف المحادثة.",
    confirmDeleteThread: "هل أنت متأكد من حذف هذه المحادثة بالكامل؟",
    selectAll: "تحديد الكل",
    clearSelection: "إلغاء التحديد",
    deleteSelected: "حذف المحدد",
    deleteAll: "حذف الكل",
    selectedCount: "محدد",
    confirmDeleteSelected: "هل أنت متأكد من حذف المحادثات المحددة؟",
    confirmDeleteAll: "هل أنت متأكد من حذف كل المحادثات؟",
    bulkDeletePartialFailed: "تم حذف بعض المحادثات، لكن فشل حذف",
  },
  en: {
    loading: "Loading conversations...",
    loadFailed: "Failed to load conversations.",
    authRequired: "You need to sign in to view conversations.",
    emptyTitle: "No conversations yet",
    emptyBody: "Start a new chat from the New Chat box above.",
    noMessage: "No messages yet",
    deleteThread: "Delete",
    deleting: "Deleting...",
    deleteFailed: "Failed to delete conversation.",
    confirmDeleteThread: "Are you sure you want to delete this conversation?",
    selectAll: "Select all",
    clearSelection: "Clear selection",
    deleteSelected: "Delete selected",
    deleteAll: "Delete all",
    selectedCount: "selected",
    confirmDeleteSelected: "Are you sure you want to delete selected conversations?",
    confirmDeleteAll: "Are you sure you want to delete all conversations?",
    bulkDeletePartialFailed: "Some conversations were deleted, but failed to delete",
  },
} as const;

export function MessagesInbox({ locale = "ar", threads: initialThreads = [] }: MessagesInboxProps) {
  const t = copy[locale];

  const [threads, setThreads] = useState<InboxThread[]>(
    Array.isArray(initialThreads) ? initialThreads : []
  );
  const [loading, setLoading] = useState(Array.isArray(initialThreads) ? false : true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const isBusy = Boolean(deletingThreadId) || isBulkDeleting;
  const isSelectionMode = selectedThreadIds.length > 0;

  useEffect(() => {
    if (isUnauthorized) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchThreads() {
      try {
        setError(null);

        const response = await fetch("/api/messages", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const payload = await response.json().catch(() => null);

        if (cancelled) return;

        if (response.status === 401) {
          setIsUnauthorized(true);
          setError(t.authRequired);
          return;
        }

        if (!response.ok || !payload?.success) {
          setError(payload?.error?.message ?? t.loadFailed);
          return;
        }

        const list = Array.isArray(payload?.data?.threads)
          ? (payload.data.threads as InboxThread[])
          : [];
        setThreads(list);
      } catch {
        if (cancelled) return;
        setError(t.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchThreads();

    const id = setInterval(() => {
      void fetchThreads();
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isUnauthorized, t.authRequired, t.loadFailed]);

  const sorted = useMemo(() => {
    return [...threads].sort((a, b) => {
      const ua = Number(a.unreadCount || 0);
      const ub = Number(b.unreadCount || 0);
      if (ub !== ua) return ub - ua;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [threads]);

  const sortedIds = useMemo(() => sorted.map((thread) => thread.id), [sorted]);
  const isAllSelected =
    sortedIds.length > 0 && sortedIds.every((id) => selectedThreadIds.includes(id));

  function toggleThread(threadId: string) {
    setSelectedThreadIds((prev) =>
      prev.includes(threadId)
        ? prev.filter((id) => id !== threadId)
        : [...prev, threadId]
    );
  }

  function toggleAllThreads() {
    setSelectedThreadIds(isAllSelected ? [] : sortedIds);
  }

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
    setSelectedThreadIds((prev) => prev.filter((id) => id !== threadId));
    return true;
  }

  async function deleteSingleThread(threadId: string) {
    if (isBusy) return;

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

  async function bulkDelete(targetIds: string[], confirmMessage: string) {
    if (isBusy || targetIds.length === 0) return;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    setError(null);

    let failedCount = 0;

    try {
      for (const threadId of targetIds) {
        setDeletingThreadId(threadId);
        try {
          const ok = await requestDeleteThread(threadId);
          if (!ok) {
            failedCount += 1;
            if (isUnauthorized) break;
          }
        } catch {
          failedCount += 1;
        }
      }

      if (!isUnauthorized && failedCount > 0) {
        setError(`${t.bulkDeletePartialFailed} ${failedCount}.`);
      }
    } finally {
      setDeletingThreadId(null);
      setIsBulkDeleting(false);
      setSelectedThreadIds([]);
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
    return (
      <div className="state-card" style={{ display: "grid", gap: 8 }}>
        <strong>{t.emptyTitle}</strong>
        <span style={{ opacity: 0.8 }}>{t.emptyBody}</span>
      </div>
    );
  }

  return (
    <div className="state-card" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn small" onClick={toggleAllThreads}>
            {isAllSelected ? t.clearSelection : t.selectAll}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={selectedThreadIds.length === 0 || isBusy}
            onClick={() => bulkDelete(selectedThreadIds, t.confirmDeleteSelected)}
          >
            {isBusy ? t.deleting : t.deleteSelected}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={sorted.length === 0 || isBusy}
            onClick={() => bulkDelete(sortedIds, t.confirmDeleteAll)}
          >
            {isBusy ? t.deleting : t.deleteAll}
          </button>
        </div>
        <span style={{ color: "var(--muted)", fontSize: "13px" }}>
          {selectedThreadIds.length} {t.selectedCount}
        </span>
      </div>

      {sorted.map((thread) => (
        <div
          key={thread.id}
          className="messages-inbox__item"
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={selectedThreadIds.includes(thread.id)}
            onChange={() => toggleThread(thread.id)}
            disabled={isBusy}
          />

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
              {thread.lastMessage?.body?.trim() || t.noMessage}
            </p>
          </Link>

          <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <time className="messages-inbox__time">
              {new Date(thread.updatedAt).toLocaleString(
                locale === "ar" ? "ar-BH" : "en-US",
                { hour12: locale !== "ar" }
              )}
            </time>
            {!isSelectionMode ? (
              <button
                type="button"
                className="btn small"
                disabled={isBusy}
                onClick={() => deleteSingleThread(thread.id)}
              >
                {deletingThreadId === thread.id ? t.deleting : t.deleteThread}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
