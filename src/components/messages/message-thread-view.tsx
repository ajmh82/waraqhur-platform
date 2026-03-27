"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeInMakkah } from "@/lib/date-time";

interface ThreadUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ThreadMessage {
  id: string;
  body: string;
  createdAt: string;
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

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      ),
    [messages]
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
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteMessages(deleteAll: boolean) {
    if (!deleteAll && selectedIds.length === 0) return;
    await runDelete(deleteAll ? { deleteAll: true } : { messageIds: selectedIds });
  }

  async function deleteSingle(messageId: string) {
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

                <article
                  style={{
                    maxWidth: "min(78%, 520px)",
                    display: "grid",
                    gap: "8px",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    background: isOwnMessage
                      ? "linear-gradient(135deg, rgba(14,165,233,0.22), rgba(37,99,235,0.22))"
                      : "rgba(255,255,255,0.05)",
                    border: isOwnMessage
                      ? "1px solid rgba(14,165,233,0.2)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.12)",
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                    {message.body}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {formatDateTimeInMakkah(
                        message.createdAt,
                        locale === "en" ? "en-US" : "ar-BH"
                      )}
                    </span>

                    <button
                      type="button"
                      className="btn small"
                      disabled={isDeleting}
                      onClick={() => deleteSingle(message.id)}
                    >
                      {isDeleting ? t.deleting : t.deleteOne}
                    </button>
                  </div>
                </article>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: "18px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {composer}
      </div>
    </section>
  );
}
