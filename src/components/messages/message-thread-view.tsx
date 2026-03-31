"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeInMakkah } from "@/lib/date-time";
import { MessageThreadBlockControls } from "@/components/messages/message-thread-block-controls";

interface ThreadUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ThreadMessage {
  id: string;
  body: string;
  contentType?: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaSizeBytes?: number | null;
  createdAt: string;
  readAt?: string | null;
  senderUserId: string;
}

interface MessageThreadViewProps {
  threadId: string;
  currentUserId: string;
  otherUser: ThreadUser;
  messages: ThreadMessage[];
  composer: React.ReactNode;
  locale?: "ar" | "en";
}

const copy = {
  ar: {
    empty: "لا توجد رسائل بعد. ابدأ أول رسالة الآن.",
    selectAll: "تحديد الكل",
    clearSelection: "إلغاء التحديد",
    deleteSelected: "حذف المحدد",
    deleteAll: "حذف كل الرسائل",
    deleteOne: "حذف",
    deleting: "جارٍ الحذف...",
    deleteFailed: "تعذر حذف الرسائل.",
    selectedCount: "محدد",
    confirmDeleteOne: "هل أنت متأكد من حذف هذه الرسالة؟",
    confirmDeleteSelected: "هل أنت متأكد من حذف الرسائل المحددة؟",
    confirmDeleteAll: "هل أنت متأكد من حذف كل الرسائل في المحادثة؟",
    openImage: "فتح الصورة",
    sent: "تم الإرسال",
    delivered: "تم التسليم",
    read: "تمت القراءة",
  },
  en: {
    empty: "No messages yet. Send the first message now.",
    selectAll: "Select all",
    clearSelection: "Clear selection",
    deleteSelected: "Delete selected",
    deleteAll: "Delete all",
    deleteOne: "Delete",
    deleting: "Deleting...",
    deleteFailed: "Failed to delete messages.",
    selectedCount: "selected",
    confirmDeleteOne: "Are you sure you want to delete this message?",
    confirmDeleteSelected: "Are you sure you want to delete selected messages?",
    confirmDeleteAll: "Are you sure you want to delete all messages in this thread?",
    openImage: "Open image",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
  },
} as const;

export function MessageThreadView({
  threadId,
  currentUserId,
  otherUser,
  messages,
  composer,
  locale = "ar",
}: MessageThreadViewProps) {
  const t = copy[locale];
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<ThreadMessage[]>(messages);
  const [pollingActive, setPollingActive] = useState(true);

  useEffect(() => {
    setLiveMessages(messages);
  }, [messages]);

  async function refreshThreadSilently() {
    try {
      const res = await fetch(`/api/messages/${threadId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 404) {
        setPollingActive(false);
        return;
      }
      if (!res.ok) return;
      const payload = await res.json().catch(() => null);
      if (!payload?.success) return;

      const next = Array.isArray(payload?.data?.thread?.messages)
        ? payload.data.thread.messages
            .map(
              (m: {
                id?: unknown;
                body?: unknown;
                contentType?: unknown;
                mediaUrl?: unknown;
                mediaMimeType?: unknown;
                mediaSizeBytes?: unknown;
                createdAt?: unknown;
                readAt?: unknown;
                senderUserId?: unknown;
              }) => ({
                id: typeof m?.id === "string" ? m.id : "",
                body: typeof m?.body === "string" ? m.body : "",
                contentType: typeof m?.contentType === "string" ? m.contentType : undefined,
                mediaUrl: typeof m?.mediaUrl === "string" ? m.mediaUrl : null,
                mediaMimeType:
                  typeof m?.mediaMimeType === "string" ? m.mediaMimeType : null,
                mediaSizeBytes:
                  typeof m?.mediaSizeBytes === "number" ? m.mediaSizeBytes : null,
                createdAt: typeof m?.createdAt === "string" ? m.createdAt : "",
                readAt: typeof m?.readAt === "string" ? m.readAt : null,
                senderUserId: typeof m?.senderUserId === "string" ? m.senderUserId : "",
              })
            )
            .filter((m: ThreadMessage) => m.id && m.createdAt && m.senderUserId)
        : [];

      setLiveMessages(next);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (!pollingActive) return;

    let active = true;

    const run = async () => {
      if (!active) return;
      if (document.visibilityState !== "visible") return;
      await refreshThreadSilently();
    };

    const id = window.setInterval(run, 1500);
    const onFocus = () => {
      void run();
    };
    const onSent = () => {
      void run();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("dm:sent", onSent);

    return () => {
      active = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("dm:sent", onSent);
    };
  }, [threadId, pollingActive]);

  const sortedMessages = useMemo(
    () =>
      [...liveMessages].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      ),
    [liveMessages]
  );

  const messageIds = sortedMessages.map((m) => m.id);
  const isAllSelected =
    messageIds.length > 0 && messageIds.every((id) => selectedIds.includes(id));

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelectedIds(isAllSelected ? [] : messageIds);
  }

  async function runDelete(payload: { deleteAll?: boolean; messageIds?: string[] }) {
    if (isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/messages/${threadId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const apiPayload = await response.json().catch(() => null);

      if (!response.ok || !apiPayload?.success) {
        setError(apiPayload?.error?.message ?? t.deleteFailed);
        return;
      }

      setSelectedIds([]);

      if (apiPayload?.data?.threadDeleted || apiPayload?.data?.hiddenForViewer) {
        router.push("/messages");
        return;
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteMessages(deleteAll: boolean) {
    if (!deleteAll && selectedIds.length === 0) return;

    const confirmed = deleteAll
      ? window.confirm(t.confirmDeleteAll)
      : window.confirm(t.confirmDeleteSelected);

    if (!confirmed) return;

    await runDelete(deleteAll ? { deleteAll: true } : { messageIds: selectedIds });
  }

  async function deleteSingle(messageId: string) {
    const confirmed = window.confirm(t.confirmDeleteOne);
    if (!confirmed) return;
    await runDelete({ messageIds: [messageId] });
  }

  return (
    <section
      className="state-card"
      style={{
        margin: 0,
        maxWidth: "100%",
        padding: "0",
        overflow: "hidden",
        display: "grid",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "999px",
            overflow: "hidden",
            flexShrink: 0,
            background: otherUser.avatarUrl
              ? "transparent"
              : "linear-gradient(135deg, #0ea5e9, #2563eb)",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
          }}
        >
          {otherUser.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={otherUser.avatarUrl}
              alt={otherUser.displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            otherUser.displayName.charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ display: "grid", gap: "4px", minWidth: 0 }}>
          <strong style={{ fontSize: "16px" }}>{otherUser.displayName}</strong>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>
            @{otherUser.username}
          </span>
        </div>

        <MessageThreadBlockControls targetUserId={otherUser.id} locale={locale} />
      </header>

      <div
        style={{
          display: "grid",
          gap: "10px",
          padding: "12px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <button type="button" className="btn small" onClick={toggleAll}>
            {isAllSelected ? t.clearSelection : t.selectAll}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={selectedIds.length === 0 || isDeleting}
            onClick={() => deleteMessages(false)}
          >
            {isDeleting ? t.deleting : t.deleteSelected}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={sortedMessages.length === 0 || isDeleting}
            onClick={() => deleteMessages(true)}
          >
            {isDeleting ? t.deleting : t.deleteAll}
          </button>
        </div>

        <span style={{ color: "var(--muted)", fontSize: "13px" }}>
          {selectedIds.length} {t.selectedCount}
        </span>

        {error ? (
          <p style={{ margin: 0, color: "var(--danger)", fontSize: "14px" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gap: "12px",
          padding: "18px",
          minHeight: "320px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        {sortedMessages.length === 0 ? (
          <div
            style={{
              borderRadius: "18px",
              padding: "18px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--muted)",
            }}
          >
            {t.empty}
          </div>
        ) : (
          sortedMessages.map((message) => {
            const isOwnMessage = message.senderUserId === currentUserId;
            const checked = selectedIds.includes(message.id);
            const hasImage = Boolean(message.mediaUrl);
            const messageStatus = isOwnMessage
              ? message.readAt
                ? t.read
                : t.delivered
              : t.sent;

            return (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: isOwnMessage ? "flex-start" : "flex-end",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(message.id)}
                  style={{ marginTop: "8px" }}
                />

                <div
                  style={{
                    display: "grid",
                    gap: "8px",
                    maxWidth: "min(560px, 78vw)",
                  }}
                >
                  {isOwnMessage ? (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        color: "var(--muted)",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {message.readAt ? `✓✓ ${t.read}` : `✓ ${t.delivered}`}
                    </div>
                  ) : null}
                  <div
                    style={{
                      borderRadius: "14px",
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: isOwnMessage
                        ? "rgba(14,165,233,0.15)"
                        : "rgba(255,255,255,0.04)",
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {hasImage ? (
                      <div style={{ display: "grid", gap: "8px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={message.mediaUrl ?? ""}
                          alt="dm-image"
                          style={{
                            display: "block",
                            maxWidth: "100%",
                            borderRadius: "10px",
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "#020617",
                          }}
                        />
                        <a
                          href={message.mediaUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#7dd3fc",
                            textDecoration: "none",
                            fontSize: "12px",
                            fontWeight: 700,
                            width: "fit-content",
                          }}
                        >
                          {t.openImage}
                        </a>
                      </div>
                    ) : null}

                    {message.body && message.body !== "[image]" ? (
                      <div>{message.body}</div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "grid", gap: "3px" }}>
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                        {formatDateTimeInMakkah(
                          message.createdAt,
                          locale === "en" ? "en-US" : "ar-BH"
                        )}
                      </span>
                      <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                        {isOwnMessage
                          ? message.readAt
                            ? "✓✓"
                            : "✓"
                          : "•"}{" "}
                        {messageStatus}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn small"
                      onClick={() => deleteSingle(message.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? t.deleting : t.deleteOne}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "16px",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        {composer}
      </footer>
    </section>
  );
}
