"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface TweetActionBarProps {
  postId: string;
  href: string;
  commentsCount: number;
  initialLikesCount: number;
  initialRepostsCount?: number;
  initialBookmarksCount?: number;
  initialSharesCount?: number;
  initialIsLiked?: boolean;
  initialIsReposted?: boolean;
  initialIsBookmarked?: boolean;
  compact?: boolean;
  locale?: "ar" | "en";
}

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ThreadLite {
  id: string;
  otherUser: SearchUser;
  lastMessageText?: string | null;
}

const copy = {
  ar: {
    shareFailed: "تعذر تنفيذ المشاركة.",
    shareCopied: "تم نسخ رابط التغريدة.",
    shareExternal: "مشاركة خارجية",
    shareToDm: "إرسال عبر الرسائل",
    shareTitle: "مشاركة عبر الرسائل",
    conversations: "المحادثات",
    users: "المستخدمون",
    searchUsersPlaceholder: "ابحث باسم المستخدم أو الاسم المعروض...",
    searchLoading: "جارٍ البحث...",
    noConversations: "لا توجد محادثات مفتوحة.",
    noUsers: "لا يوجد مستخدمون مطابقون.",
    sentToConversation: "تم إرسال التغريدة للمحادثة.",
    sendFailed: "تعذر الإرسال.",
    closeShare: "إغلاق",
    sending: "جارٍ الإرسال...",
    dmSearching: "جارٍ تجهيز الإرسال...",
    dmRequestSent: "تم إرسال طلب محادثة. بعد القبول يمكنك إرسال الرابط.",
    dmFailed: "تعذر الإرسال للخاص.",
  },
  en: {
    shareFailed: "Failed to share.",
    shareCopied: "Post link copied.",
    shareExternal: "External Share",
    shareToDm: "Send in Messages",
    shareTitle: "Share in Direct",
    conversations: "Conversations",
    users: "Users",
    searchUsersPlaceholder: "Search username or display name...",
    searchLoading: "Searching...",
    noConversations: "No open conversations.",
    noUsers: "No matching users.",
    sentToConversation: "Post sent to conversation.",
    sendFailed: "Failed to send.",
    closeShare: "Close",
    sending: "Sending...",
    dmSearching: "Preparing send...",
    dmRequestSent: "Chat request sent. You can send the link after acceptance.",
    dmFailed: "Failed to send in DM.",
  },
} as const;

export function TweetActionBar({
  postId,
  href,
  commentsCount,
  initialLikesCount,
  initialRepostsCount = 0,
  initialBookmarksCount = 0,
  initialSharesCount = 0,
  initialIsLiked = false,
  initialIsReposted = false,
  initialIsBookmarked = false,
  compact = false,
  locale = "ar",
}: TweetActionBarProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [bookmarksCount, setBookmarksCount] = useState(initialBookmarksCount);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [repostsCount, setRepostsCount] = useState(initialRepostsCount);
  const [isReposted, setIsReposted] = useState(initialIsReposted);
  const [sharesCount, setSharesCount] = useState(initialSharesCount);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [threads, setThreads] = useState<ThreadLite[]>([]);
  const [shareSearch, setShareSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const searchRequestIdRef = useRef(0);
  const shareRootRef = useRef<HTMLDivElement | null>(null);
  const t = copy[locale];
  const shareAnchorStyle =
    locale === "ar"
      ? ({ insetInlineStart: 0 } as const)
      : ({ insetInlineEnd: 0 } as const);

  function getTargetUrl() {
    return typeof window !== "undefined"
      ? `${window.location.origin}${href}`
      : href;
  }

  async function handleLike() {
    const response = await fetch(`/api/posts/${postId}/like`, {
      method: isLiked ? "DELETE" : "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;

    const nextLiked = payload?.data?.liked ?? !isLiked;
    const nextCount =
      payload?.data?.likesCount ??
      likesCount + (nextLiked ? (isLiked ? 0 : 1) : -1);

    setIsLiked(nextLiked);
    setLikesCount(Math.max(0, nextCount));
  }

  async function handleBookmark() {
    const response = await fetch(`/api/posts/${postId}/bookmark`, {
      method: isBookmarked ? "DELETE" : "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;

    const nextBookmarked = payload?.data?.bookmarked ?? !isBookmarked;
    const nextCount =
      payload?.data?.bookmarksCount ??
      bookmarksCount + (nextBookmarked ? (isBookmarked ? 0 : 1) : -1);

    setIsBookmarked(nextBookmarked);
    setBookmarksCount(Math.max(0, nextCount));
  }

  async function handleRepost() {
    const response = await fetch(`/api/posts/${postId}/repost`, {
      method: isReposted ? "DELETE" : "POST",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) return;

    const nextReposted = payload?.data?.reposted ?? !isReposted;
    const nextCount =
      payload?.data?.repostsCount ??
      repostsCount + (nextReposted ? (isReposted ? 0 : 1) : -1);

    setIsReposted(nextReposted);
    setRepostsCount(Math.max(0, nextCount));
  }

  async function handleExternalShare() {
    setShareError(null);
    setShareNotice(null);

    const targetUrl = getTargetUrl();
    const shareText = `${targetUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Waraqhur",
          text: shareText,
          url: targetUrl,
        });
        setSharesCount((value) => value + 1);
        setShareNotice(t.shareCopied);
        return;
      } catch {
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        setSharesCount((value) => value + 1);
        setShareNotice(t.shareCopied);
      } catch {
        setShareError(t.shareFailed);
      }
    }
  }

  async function openOrRequestThread(targetUserId: string) {
    const response = await fetch("/api/messages/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      return { ok: false as const, threadId: null, mode: null };
    }

    const threadId =
      typeof payload?.data?.thread?.id === "string" ? payload.data.thread.id : null;
    const mode = typeof payload?.data?.mode === "string" ? payload.data.mode : null;
    return { ok: true as const, threadId, mode };
  }

  async function sendMessageToThread(threadId: string, body: string) {
    const response = await fetch(`/api/messages/${threadId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    const payload = await response.json().catch(() => null);
    return Boolean(response.ok && payload?.success);
  }

  async function sendPostToThread(threadId: string) {
    const sent = await sendMessageToThread(threadId, getTargetUrl());
    if (!sent) {
      setShareError(t.sendFailed);
      return;
    }
    setShareNotice(t.sentToConversation);
    setSharesCount((value) => value + 1);
  }

  async function loadOpenConversations() {
    const response = await fetch("/api/messages", {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      setThreads([]);
      return;
    }
    const list = Array.isArray(payload?.data?.threads)
      ? payload.data.threads
      : [];
    const mapped = list
      .map((thread: unknown) => {
        const t = thread as {
          id?: string;
          otherUser?: SearchUser;
          lastMessage?: { body?: string | null } | null;
        };
        if (!t?.id || !t?.otherUser?.id) return null;
        return {
          id: t.id,
          otherUser: t.otherUser,
          lastMessageText:
            typeof t.lastMessage?.body === "string" ? t.lastMessage.body : null,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        otherUser: SearchUser;
        lastMessageText?: string | null;
      }>;
    setThreads(mapped);
  }

  async function handleLiveSearch(query: string) {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setSearchResults([]);
      return;
    }
    const requestId = ++searchRequestIdRef.current;
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        if (requestId !== searchRequestIdRef.current) return;
        setSearchResults([]);
        return;
      }
      const users = Array.isArray(payload?.data?.users)
        ? (payload.data.users as SearchUser[])
        : [];
      if (requestId !== searchRequestIdRef.current) return;
      setSearchResults(users.slice(0, 8));
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setSearchLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!shareOpen) return;
    void loadOpenConversations();
  }, [shareOpen]);

  useEffect(() => {
    if (!shareOpen) return;
    function onDocumentClick(event: MouseEvent) {
      if (!shareRootRef.current) return;
      if (!shareRootRef.current.contains(event.target as Node)) {
        setShareOpen(false);
      }
    }
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [shareOpen]);

  return (
    <div
      ref={shareRootRef}
      className={`tweet-action-bar ${
        compact ? "tweet-action-bar--compact" : ""
      }`}
      style={{ position: "relative" }}
    >
      <Link href={href} className="tweet-action-bar__item tweet-action-bar__item--comment">
        <span className="tweet-action-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M20 11.2c0 4.5-4.1 8.1-9.2 8.1-1.1 0-2.2-.2-3.2-.6L4 20l1.4-3c-2.3-1.5-3.8-3.6-3.8-5.8C1.6 6.7 5.7 3 10.8 3S20 6.7 20 11.2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="tweet-action-bar__count">{commentsCount}</span>
      </Link>

      <button
        type="button"
        onClick={handleRepost}
        className={`tweet-action-bar__item tweet-action-bar__item--repost ${
          isReposted ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <span className="tweet-action-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M7 6h10v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="m7 6 4-3M7 6l4 3M17 18l-4 3m4-3-4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 18H7V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="tweet-action-bar__count">{repostsCount}</span>
      </button>

      <button
        type="button"
        onClick={handleLike}
        className={`tweet-action-bar__item tweet-action-bar__item--like ${
          isLiked ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <span className="tweet-action-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M12 20.4s-7-4.3-9.3-8.6C1.2 9 2.7 5.9 6 5.5c2-.2 3.3.9 4 2 1-1.4 2.5-2.2 4.3-2 3.2.4 4.7 3.4 3.3 6.3-2.3 4.3-9.6 8.6-9.6 8.6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="tweet-action-bar__count">{likesCount}</span>
      </button>

      <button
        type="button"
        onClick={handleBookmark}
        className={`tweet-action-bar__item tweet-action-bar__item--share ${
          isBookmarked ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <span className="tweet-action-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v14l-7.5-3.8L4.5 20V6A1.5 1.5 0 0 1 6 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="tweet-action-bar__count">{bookmarksCount}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          const nextOpen = !shareOpen;
          setShareOpen(nextOpen);
          setShareError(null);
          setShareNotice(null);
          if (nextOpen) {
            void handleLiveSearch(shareSearch);
          }
        }}
        className="tweet-action-bar__item tweet-action-bar__item--share"
      >
        <span className="tweet-action-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M12 4v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="m8 8 4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 14.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        {sharesCount > 0 ? (
          <span className="tweet-action-bar__count">{sharesCount}</span>
        ) : null}
      </button>

      {shareOpen ? (
        <div
          className="tweet-share-panel"
          style={{
            position: "absolute",
            top: "auto",
            bottom: "calc(100% + 8px)",
            zIndex: 50,
            minWidth: "280px",
            width: "min(92vw, 420px)",
            display: "grid",
            gap: "10px",
            padding: "12px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(2,6,23,0.96)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            ...shareAnchorStyle,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <strong style={{ fontSize: "15px" }}>{t.shareTitle}</strong>
            <button
              type="button"
              className="btn small"
              onClick={() => setShareOpen(false)}
              disabled={shareBusy}
            >
              {t.closeShare}
            </button>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{t.conversations}</span>
            {threads.length === 0 ? (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                {t.noConversations}
              </p>
            ) : (
              <div style={{ display: "grid", gap: "6px", maxHeight: "220px", overflowY: "auto" }}>
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className="btn small"
                    disabled={shareBusy}
                    onClick={async () => {
                      setShareBusy(true);
                      setShareError(null);
                      setShareNotice(null);
                      try {
                        await sendPostToThread(thread.id);
                      } finally {
                        setShareBusy(false);
                      }
                    }}
                    style={{ justifyContent: "space-between", minHeight: "52px" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "999px",
                          background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {(thread.otherUser.displayName || thread.otherUser.username || "U")
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                      <span style={{ display: "grid", gap: "2px", textAlign: "start", minWidth: 0 }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {thread.otherUser.displayName}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          @{thread.otherUser.username}
                        </span>
                        {thread.lastMessageText ? (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {thread.lastMessageText}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {shareBusy ? <span style={{ fontSize: "11px" }}>{t.sending}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{t.users}</span>
            <input
              type="search"
              value={shareSearch}
              onChange={(event) => {
                const nextValue = event.target.value;
                setShareSearch(nextValue);
                void handleLiveSearch(nextValue);
              }}
              placeholder={t.searchUsersPlaceholder}
              style={{
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                padding: "8px 10px",
              }}
            />
            {searchLoading ? (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                {t.searchLoading}
              </p>
            ) : null}
            {!searchLoading && shareSearch.trim().length >= 2 && searchResults.length === 0 ? (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                {t.noUsers}
              </p>
            ) : null}
            {searchResults.length > 0 ? (
              <div style={{ display: "grid", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="btn small"
                    disabled={shareBusy}
                    onClick={async () => {
                      setShareBusy(true);
                      setShareError(null);
                      setShareNotice(null);
                      try {
                        const threadResult = await openOrRequestThread(user.id);
                        if (!threadResult.ok) {
                          setShareError(t.dmFailed);
                          return;
                        }
                        if (!threadResult.threadId) {
                          setShareNotice(t.dmRequestSent);
                          return;
                        }
                        await sendPostToThread(threadResult.threadId);
                      } finally {
                        setShareBusy(false);
                      }
                    }}
                    style={{ justifyContent: "space-between", minHeight: "52px" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "999px",
                          background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                          fontWeight: 900,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {(user.displayName || user.username || "U").slice(0, 1).toUpperCase()}
                      </span>
                      <span style={{ display: "grid", gap: "2px", textAlign: "start", minWidth: 0 }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {user.displayName}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          @{user.username}
                        </span>
                      </span>
                    </span>
                    {shareBusy ? <span style={{ fontSize: "11px" }}>{t.sending}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="btn small"
            onClick={async () => {
              setShareBusy(true);
              setShareError(null);
              setShareNotice(null);
              try {
                await handleExternalShare();
              } finally {
                setShareBusy(false);
              }
            }}
            disabled={shareBusy}
          >
            {t.shareExternal}
          </button>

          {shareNotice ? (
            <p style={{ margin: 0, color: "#86efac", fontSize: "13px" }}>
              {shareNotice}
            </p>
          ) : null}

          {shareError ? (
            <p style={{ margin: 0, color: "var(--danger)", fontSize: "13px" }}>
              {shareError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
