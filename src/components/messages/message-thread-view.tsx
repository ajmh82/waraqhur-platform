"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTimeInMakkah, formatRelativeTime } from "@/lib/date-time";
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
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    senderUserId: string;
    senderDisplayName: string;
    previewText: string;
  } | null;
}

interface MessageThreadViewProps {
  threadId: string;
  currentUserId: string;
  otherUser: ThreadUser;
  messages: ThreadMessage[];
  composer: React.ReactNode;
  locale?: "ar" | "en";
}

type ReactionRow = {
  messageId: string;
  emoji: string;
  userId: string;
};

type ReactionSummary = {
  emoji: string;
  count: number;
  mine: boolean;
};

const REACTION_EMOJI = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;

const copy = {
  ar: {
    empty: "لا توجد رسائل بعد. ابدأ أول رسالة الآن.",
    selectMode: "تحديد",
    cancelSelection: "إلغاء",
    selectAll: "تحديد الكل",
    deleteSelected: "حذف المحدد",
    deleteAll: "حذف الكل",
    deleting: "جارٍ الحذف...",
    deleteFailed: "تعذر حذف الرسائل.",
    selectedCount: "محدد",
    openImage: "فتح الصورة",
    closeImage: "إغلاق",
    read: "مقروءة",
    delivered: "تم التسليم",
    justNow: "الآن",
    deleteScopeTitle: "تأكيد الحذف",
    deleteForMe: "حذف من عندي",
    deleteForEveryone: "حذف من الجميع",
  },
  en: {
    empty: "No messages yet. Send the first message now.",
    selectMode: "Select",
    cancelSelection: "Cancel",
    selectAll: "Select all",
    deleteSelected: "Delete selected",
    deleteAll: "Delete all",
    deleting: "Deleting...",
    deleteFailed: "Failed to delete messages.",
    selectedCount: "selected",
    openImage: "Open image",
    closeImage: "Close",
    read: "Read",
    delivered: "Delivered",
    justNow: "just now",
    deleteScopeTitle: "Confirm delete",
    deleteForMe: "Delete for me",
    deleteForEveryone: "Delete for everyone",
  },
} as const;

function renderAvatar(displayName: string, avatarUrl: string | null) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return (
    <span style={{ fontWeight: 800, fontSize: "12px", color: "#fff" }}>
      {displayName.slice(0, 1).toUpperCase()}
    </span>
  );
}

function buildReactionMap(rows: ReactionRow[], currentUserId: string) {
  const grouped = new Map<string, Map<string, { count: number; mine: boolean }>>();

  for (const row of rows) {
    if (!grouped.has(row.messageId)) grouped.set(row.messageId, new Map());
    const byEmoji = grouped.get(row.messageId)!;
    const current = byEmoji.get(row.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (row.userId === currentUserId) current.mine = true;
    byEmoji.set(row.emoji, current);
  }

  const result: Record<string, ReactionSummary[]> = {};
  for (const [messageId, byEmoji] of grouped.entries()) {
    result[messageId] = Array.from(byEmoji.entries()).map(([emoji, value]) => ({
      emoji,
      count: value.count,
      mine: value.mine,
    }));
  }

  return result;
}

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

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessages, setLiveMessages] = useState<ThreadMessage[]>(messages);
  const [pollingActive, setPollingActive] = useState(true);
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, ReactionSummary[]>>({});
  const [deleteScopeModal, setDeleteScopeModal] = useState<{ mode: "selected" | "all" } | null>(null);

  const [dragState, setDragState] = useState<{ messageId: string; startX: number; triggered: boolean } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function scrollToConversationEnd(behavior: ScrollBehavior = "smooth") {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }

  async function loadReactionsForMessages(messageIds: string[]) {
    if (!messageIds.length) {
      setReactionsByMessage({});
      return;
    }

    try {
      const params = new URLSearchParams();
      for (const id of messageIds) params.append("messageId", id);

      const res = await fetch(`/api/messages/reactions?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) return;
      const payload = await res.json().catch(() => null);
      if (!payload?.success) return;

      const rows = Array.isArray(payload?.data?.reactions) ? (payload.data.reactions as ReactionRow[]) : [];
      setReactionsByMessage(buildReactionMap(rows, currentUserId));
    } catch {
      // silent
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    try {
      const res = await fetch("/api/messages/reactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) return;

      await loadReactionsForMessages(sortedMessages.map((m) => m.id));
      setReactionPickerFor(null);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    setLiveMessages(messages);
  }, [messages]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeTick((v) => v + 1);
    }, 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    scrollToConversationEnd("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openImageUrl) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenImageUrl(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openImageUrl]);

  useEffect(() => {
    if (!reactionPickerFor) return;
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setReactionPickerFor(null);
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [reactionPickerFor]);

  function formatMessageTime(createdAt: string) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 10) return t.justNow;
    if (diffMs < 24 * 60 * 60 * 1000) {
      return formatRelativeTime(createdAt, locale === "en" ? "en-US" : "ar-BH");
    }
    return formatDateTimeInMakkah(createdAt, locale === "en" ? "en-US" : "ar-BH");
  }

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
        ? payload.data.thread.messages.filter((m: ThreadMessage) => m?.id && m?.createdAt && m?.senderUserId)
        : [];

      setLiveMessages(next);
      await loadReactionsForMessages(next.map((m: ThreadMessage) => m.id));
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
    const onFocus = () => void run();
    const onSent = () => void run();

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

  useEffect(() => {
    void loadReactionsForMessages(sortedMessages.map((m) => m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMessages.length]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom < 180) {
      scrollToConversationEnd("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMessages.length]);

  const ownMessageIds = sortedMessages
    .filter((m) => m.senderUserId === currentUserId)
    .map((m) => m.id);

  const isAllSelected =
    ownMessageIds.length > 0 && ownMessageIds.every((id) => selectedIds.includes(id));

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    setSelectedIds(isAllSelected ? [] : ownMessageIds);
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds([]);
  }

  function leaveSelectionMode() {
    setSelectionMode(false);
    setSelectedIds([]);
  }

  async function runDelete(payload: {
    deleteAll?: boolean;
    messageIds?: string[];
    deleteScope?: "for_me" | "for_everyone";
  }) {
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

      if (apiPayload?.data?.threadDeleted) {
        router.push("/messages");
        return;
      }

      await refreshThreadSilently();
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmBulkDelete(scope: "for_me" | "for_everyone") {
    if (!deleteScopeModal) return;

    if (deleteScopeModal.mode === "selected") {
      if (selectedIds.length === 0) return;
      await runDelete({ messageIds: selectedIds, deleteScope: scope });
      leaveSelectionMode();
      setDeleteScopeModal(null);
      return;
    }

    await runDelete({ deleteAll: true, deleteScope: scope });
    leaveSelectionMode();
    setDeleteScopeModal(null);
  }

  function triggerReply(message: ThreadMessage) {
    const senderDisplayName =
      message.sender?.displayName?.trim() ||
      (message.senderUserId === currentUserId
        ? locale === "ar"
          ? "أنا"
          : "Me"
        : otherUser.displayName);

    const previewText = message.body && message.body !== "[image]" ? message.body : "[image]";

    window.dispatchEvent(
      new CustomEvent("dm:reply-target", {
        detail: {
          messageId: message.id,
          senderUserId: message.senderUserId,
          senderDisplayName,
          previewText,
        },
      })
    );

    scrollToConversationEnd("smooth");
  }

  function onSwipeStart(messageId: string, clientX: number) {
    if (selectionMode) return;
    setDragState({ messageId, startX: clientX, triggered: false });
  }

  function onSwipeMove(message: ThreadMessage, clientX: number) {
    if (!dragState) return;
    if (dragState.triggered) return;
    if (dragState.messageId !== message.id) return;

    const deltaX = clientX - dragState.startX;
    const threshold = 72;

    if (Math.abs(deltaX) >= threshold) {
      clearLongPressTimer();
      triggerReply(message);
      setDragState((prev) => (prev ? { ...prev, triggered: true } : prev));
    }
  }

  function onSwipeEnd() {
    clearLongPressTimer();
    setDragState(null);
  }

  return (
    <section
      className="state-card"
      style={{
        margin: 0,
        maxWidth: "100%",
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: "420px",
        height: "calc(100dvh - 170px)",
      }}
    >
      <header
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(96vw, 860px)",
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(11,18,32,0.95)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "999px",
            overflow: "hidden",
            flexShrink: 0,
            background: otherUser.avatarUrl
              ? "transparent"
              : "linear-gradient(135deg, #0ea5e9, #2563eb)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {renderAvatar(otherUser.displayName, otherUser.avatarUrl)}
        </div>

        <div style={{ display: "grid", gap: "2px", minWidth: 0 }}>
          <strong style={{ fontSize: "14px" }}>{otherUser.displayName}</strong>
          <span style={{ color: "var(--muted)", fontSize: "12px" }}>@{otherUser.username}</span>
        </div>

        <div style={{ marginInlineStart: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <button type="button" className="btn small" onClick={selectionMode ? leaveSelectionMode : enterSelectionMode}>
            {selectionMode ? t.cancelSelection : t.selectMode}
          </button>
          <MessageThreadBlockControls targetUserId={otherUser.id} locale={locale} />
        </div>
      </header>

      {selectionMode ? (
        <div
          style={{
            position: "fixed",
            top: "62px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(96vw, 860px)",
            zIndex: 39,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            padding: "8px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(11,18,32,0.94)",
            backdropFilter: "blur(8px)",
          }}
        >
          <button type="button" className="btn small" onClick={toggleAll}>
            {isAllSelected ? t.cancelSelection : t.selectAll}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={selectedIds.length === 0 || isDeleting}
            onClick={() => setDeleteScopeModal({ mode: "selected" })}
          >
            {isDeleting ? t.deleting : t.deleteSelected}
          </button>
          <button
            type="button"
            className="btn small"
            disabled={ownMessageIds.length === 0 || isDeleting}
            onClick={() => setDeleteScopeModal({ mode: "all" })}
          >
            {isDeleting ? t.deleting : t.deleteAll}
          </button>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>
            {selectedIds.length} {t.selectedCount}
          </span>
        </div>
      ) : null}

      <div
        ref={messagesViewportRef}
        style={{
          display: "grid",
          gap: "12px",
          padding: "14px",
          paddingTop: selectionMode ? "112px" : "74px",
          paddingBottom: "162px",
          background: "rgba(255,255,255,0.015)",
          overflowY: "auto",
          overflowX: "hidden",
          flex: 1,
          minHeight: 0,
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {sortedMessages.length === 0 ? (
          <div
            style={{
              borderRadius: "14px",
              padding: "14px",
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
            const isRead = Boolean(message.readAt);
            const messageReactions = reactionsByMessage[message.id] ?? [];
            const myReaction = messageReactions.find((x) => x.mine) ?? null;

            const senderDisplayName =
              message.sender?.displayName?.trim() ||
              (message.senderUserId === currentUserId
                ? locale === "ar"
                  ? "أنا"
                  : "Me"
                : otherUser.displayName);

            const senderAvatarUrl =
              message.sender?.avatarUrl ?? (isOwnMessage ? null : otherUser.avatarUrl);

            return (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: "8px",
                  userSelect: "none",
                  position: "relative",
                }}
                onTouchStart={(event) => {
                  onSwipeStart(message.id, event.touches[0].clientX);
                  clearLongPressTimer();
                  longPressTimerRef.current = window.setTimeout(() => {
                    setReactionPickerFor(message.id);
                  }, 450);
                }}
                onTouchMove={(event) => {
                  clearLongPressTimer();
                  onSwipeMove(message, event.touches[0].clientX);
                }}
                onTouchEnd={onSwipeEnd}
                onMouseDown={(event) => onSwipeStart(message.id, event.clientX)}
                onMouseMove={(event) => onSwipeMove(message, event.clientX)}
                onMouseUp={onSwipeEnd}
                onMouseLeave={onSwipeEnd}
              >
                {!isOwnMessage ? (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "999px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: senderAvatarUrl
                        ? "transparent"
                        : "linear-gradient(135deg, #7c3aed, #c026d3)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {renderAvatar(senderDisplayName, senderAvatarUrl)}
                  </div>
                ) : null}

                {selectionMode && isOwnMessage ? (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(message.id)}
                    style={{ marginBottom: "8px" }}
                  />
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gap: "6px",
                    maxWidth: "min(560px, 74vw)",
                  }}
                >
                  {message.replyTo ? (
                    <div
                      style={{
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(2,6,23,0.25)",
                        padding: "8px 10px",
                        fontSize: "12px",
                        color: "#cbd5e1",
                      }}
                    >
                      <div style={{ fontWeight: 800, marginBottom: "4px" }}>
                        {message.replyTo.senderDisplayName}
                      </div>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {message.replyTo.previewText}
                      </div>
                    </div>
                  ) : null}

                  <div
                    onDoubleClick={() => setReactionPickerFor(message.id)}
                    style={{
                      borderRadius: "14px",
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: isOwnMessage ? "rgba(14,165,233,0.24)" : "rgba(255,255,255,0.06)",
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {hasImage ? (
                      <button
                        type="button"
                        onClick={() => setOpenImageUrl(message.mediaUrl ?? null)}
                        style={{
                          border: 0,
                          padding: 0,
                          margin: 0,
                          background: "transparent",
                          cursor: "zoom-in",
                          width: "100%",
                          display: "block",
                        }}
                        aria-label={t.openImage}
                      >
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
                      </button>
                    ) : null}

                    {message.body && message.body !== "[image]" ? <div>{message.body}</div> : null}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--muted)",
                      fontSize: "12px",
                      justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <span key={`${message.id}-${timeTick}`}>{formatMessageTime(message.createdAt)}</span>

                    {myReaction ? (
                      <button
                        type="button"
                        onClick={() => toggleReaction(message.id, myReaction.emoji)}
                        style={{
                          border: "1px solid rgba(56,189,248,0.65)",
                          background: "rgba(14,165,233,0.18)",
                          color: "#e2e8f0",
                          borderRadius: "999px",
                          padding: "1px 6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        {myReaction.emoji} {myReaction.count}
                      </button>
                    ) : null}

                    {isOwnMessage ? (
                      <span
                        title={isRead ? t.read : t.delivered}
                        style={{
                          fontWeight: 800,
                          letterSpacing: "0.3px",
                          color: isRead ? "#22c55e" : "#94a3b8",
                        }}
                      >
                        {isRead ? "✓✓" : "✓"}
                      </span>
                    ) : null}
                  </div>

                  {reactionPickerFor === message.id ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        padding: "6px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(2,6,23,0.45)",
                        width: "fit-content",
                      }}
                    >
                      {REACTION_EMOJI.map((emoji) => (
                        <button
                          key={`${message.id}-picker-${emoji}`}
                          type="button"
                          onClick={() => void toggleReaction(message.id, emoji)}
                          style={{
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: "rgba(15,23,42,0.7)",
                            color: "#fff",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "14px",
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {isOwnMessage ? (
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "999px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: senderAvatarUrl
                        ? "transparent"
                        : "linear-gradient(135deg, #2563eb, #0ea5e9)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {renderAvatar(senderDisplayName, senderAvatarUrl)}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "72px",
          width: "min(96vw, 860px)",
          zIndex: 30,
          padding: "4px 6px 6px",
          background: "rgba(11,18,32,0.96)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        {composer}
      </div>

      {deleteScopeModal ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteScopeModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1450,
            background: "rgba(2,6,23,0.65)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(92vw, 360px)",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "#0b1220",
              padding: "14px",
              display: "grid",
              gap: "10px",
            }}
          >
            <strong style={{ fontSize: "15px" }}>{t.deleteScopeTitle}</strong>
            <button
              type="button"
              className="btn small"
              onClick={() => void confirmBulkDelete("for_me")}
            >
              {t.deleteForMe}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => void confirmBulkDelete("for_everyone")}
            >
              {t.deleteForEveryone}
            </button>
          </div>
        </div>
      ) : null}

      {openImageUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenImageUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            background: "rgba(2,6,23,0.88)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <button
            type="button"
            className="btn small"
            onClick={(event) => {
              event.stopPropagation();
              setOpenImageUrl(null);
            }}
            style={{ position: "absolute", top: "14px", insetInlineEnd: "14px" }}
          >
            {t.closeImage}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={openImageUrl}
            alt="dm-full-image"
            style={{
              maxWidth: "min(96vw, 1200px)",
              maxHeight: "86vh",
              objectFit: "contain",
              borderRadius: "12px",
            }}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
