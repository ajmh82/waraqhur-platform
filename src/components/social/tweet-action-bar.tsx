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
}

const copy = {
  ar: {
    shareFailed: "تعذر تنفيذ المشاركة.",
    shareCopied: "تم نسخ رابط التغريدة.",
    shareExternal: "مشاركة خارجية",
    shareToDm: "إرسال عبر الرسائل",
    shareTitle: "إرسال التغريدة",
    conversations: "المحادثات المفتوحة",
    users: "المستخدمون",
    searchUsersPlaceholder: "ابحث باسم المستخدم أو الاسم المعروض...",
    searchLoading: "جارٍ البحث...",
    noConversations: "لا توجد محادثات مفتوحة.",
    noUsers: "لا يوجد مستخدمون مطابقون.",
    sentToConversation: "تم إرسال التغريدة للمحادثة.",
    sendFailed: "تعذر الإرسال.",
    closeShare: "إغلاق",
    dmSearching: "جارٍ تجهيز الإرسال...",
    dmRequestSent: "تم إرسال طلب محادثة. بعد القبول يمكنك إرسال الرابط.",
    dmFailed: "تعذر الإرسال للخاص.",
  },
  en: {
    shareFailed: "Failed to share.",
    shareCopied: "Post link copied.",
    shareExternal: "External Share",
    shareToDm: "Send in Messages",
    shareTitle: "Share post",
    conversations: "Open conversations",
    users: "Users",
    searchUsersPlaceholder: "Search username or display name...",
    searchLoading: "Searching...",
    noConversations: "No open conversations.",
    noUsers: "No matching users.",
    sentToConversation: "Post sent to conversation.",
    sendFailed: "Failed to send.",
    closeShare: "Close",
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
  const t = copy[locale];

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
        };
        if (!t?.id || !t?.otherUser?.id) return null;
        return {
          id: t.id,
          otherUser: t.otherUser,
        };
      })
      .filter(Boolean) as Array<{ id: string; otherUser: SearchUser }>;
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

  return (
    <div
      className={`tweet-action-bar ${
        compact ? "tweet-action-bar--compact" : ""
      }`}
      style={{ position: "relative" }}
    >
      <Link href={href} className="tweet-action-bar__item tweet-action-bar__item--comment">
        <span className="tweet-action-bar__icon">💬</span>
        <span className="tweet-action-bar__count">{commentsCount}</span>
      </Link>

      <button
        type="button"
        onClick={handleRepost}
        className={`tweet-action-bar__item tweet-action-bar__item--repost ${
          isReposted ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <span className="tweet-action-bar__icon">🔁</span>
        <span className="tweet-action-bar__count">{repostsCount}</span>
      </button>

      <button
        type="button"
        onClick={handleLike}
        className={`tweet-action-bar__item tweet-action-bar__item--like ${
          isLiked ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <span className="tweet-action-bar__icon">❤️</span>
        <span className="tweet-action-bar__count">{likesCount}</span>
      </button>

      <button
        type="button"
        onClick={handleBookmark}
        className={`tweet-action-bar__item tweet-action-bar__item--share ${
          isBookmarked ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <span className="tweet-action-bar__icon">🔖</span>
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
        <span className="tweet-action-bar__icon">📤</span>
        {sharesCount > 0 ? (
          <span className="tweet-action-bar__count">{sharesCount}</span>
        ) : null}
      </button>

      {shareOpen ? (
        <div
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "calc(100% + 8px)",
            zIndex: 50,
            minWidth: "220px",
            display: "grid",
            gap: "8px",
            padding: "10px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(2,6,23,0.96)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
          }}
        >
          <strong style={{ fontSize: "14px" }}>{t.shareTitle}</strong>

          <div style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>{t.conversations}</span>
            {threads.length === 0 ? (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                {t.noConversations}
              </p>
            ) : (
              <div style={{ display: "grid", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
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
                    style={{ justifyContent: "space-between" }}
                  >
                    <span>{thread.otherUser.displayName}</span>
                    <span>@{thread.otherUser.username}</span>
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
              <div style={{ display: "grid", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
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
                    style={{ justifyContent: "space-between" }}
                  >
                    <span>{user.displayName}</span>
                    <span>@{user.username}</span>
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

          <button
            type="button"
            className="btn small"
            onClick={() => setShareOpen(false)}
            disabled={shareBusy}
          >
            {t.closeShare}
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
