"use client";

import Link from "next/link";
import { useState } from "react";

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

const copy = {
  ar: {
    shareFailed: "تعذر تنفيذ المشاركة.",
    shareCopied: "تم نسخ رابط التغريدة.",
    shareExternal: "مشاركة خارجية",
    shareToDm: "إرسال للخاص",
    closeShare: "إغلاق",
    dmPrompt: "اكتب اسم المستخدم للإرسال له (بدون @):",
    dmSearching: "جارٍ البحث عن المستخدم...",
    dmUserNotFound: "لم يتم العثور على مستخدم مطابق.",
    dmRequestSent: "تم إرسال طلب محادثة. بعد القبول يمكنك إرسال الرابط.",
    dmSent: "تم إرسال الرابط في الخاص.",
    dmFailed: "تعذر الإرسال للخاص.",
  },
  en: {
    shareFailed: "Failed to share.",
    shareCopied: "Post link copied.",
    shareExternal: "External Share",
    shareToDm: "Send in DM",
    closeShare: "Close",
    dmPrompt: "Enter username to send to (without @):",
    dmSearching: "Searching user...",
    dmUserNotFound: "No matching user found.",
    dmRequestSent: "Chat request sent. You can send the link after acceptance.",
    dmSent: "Link sent in DM.",
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
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
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

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: targetUrl });
        setSharesCount((value) => value + 1);
        setShareNotice(t.shareCopied);
        return;
      } catch {
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        setSharesCount((value) => value + 1);
        setShareNotice(t.shareCopied);
      } catch {
        setShareError(t.shareFailed);
      }
    }
  }

  async function searchUser(query: string): Promise<SearchUser | null> {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      credentials: "include",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      return null;
    }

    const users = Array.isArray(payload?.data?.users) ? (payload.data.users as SearchUser[]) : [];
    if (users.length === 0) return null;

    const normalized = query.toLowerCase();
    const exact = users.find((u) => u.username.toLowerCase() === normalized);
    return exact ?? users[0] ?? null;
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

  async function handleShareToDm() {
    setShareError(null);
    setShareNotice(null);

    if (typeof window === "undefined") return;

    const raw = window.prompt(t.dmPrompt);
    if (raw === null) return;

    const query = raw.trim().replace(/^@+/, "");
    if (query.length < 2) {
      setShareError(t.dmUserNotFound);
      return;
    }

    setShareBusy(true);
    setShareNotice(t.dmSearching);

    try {
      const user = await searchUser(query);
      if (!user) {
        setShareNotice(null);
        setShareError(t.dmUserNotFound);
        return;
      }

      const threadResult = await openOrRequestThread(user.id);
      if (!threadResult.ok) {
        setShareNotice(null);
        setShareError(t.dmFailed);
        return;
      }

      if (!threadResult.threadId) {
        setShareNotice(t.dmRequestSent);
        setSharesCount((value) => value + 1);
        return;
      }

      const sent = await sendMessageToThread(threadResult.threadId, getTargetUrl());
      if (!sent) {
        setShareNotice(null);
        setShareError(t.dmFailed);
        return;
      }

      setShareNotice(t.dmSent);
      setSharesCount((value) => value + 1);
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <div
      className={`tweet-action-bar ${
        compact ? "tweet-action-bar--compact" : ""
      }`}
      style={{ position: "relative" }}
    >
      <Link href={href} className="tweet-action-bar__item tweet-action-bar__item--comment">
        <svg className="tweet-action-bar__svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span className="tweet-action-bar__count">{commentsCount}</span>
      </Link>

      <button
        type="button"
        onClick={handleRepost}
        className={`tweet-action-bar__item tweet-action-bar__item--repost ${
          isReposted ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <svg className="tweet-action-bar__svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 1l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span className="tweet-action-bar__count">{repostsCount}</span>
      </button>

      <button
        type="button"
        onClick={handleLike}
        className={`tweet-action-bar__item tweet-action-bar__item--like ${
          isLiked ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <svg className="tweet-action-bar__svg" width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="tweet-action-bar__count">{likesCount}</span>
      </button>

      <button
        type="button"
        onClick={handleBookmark}
        className={`tweet-action-bar__item tweet-action-bar__item--bookmark ${
          isBookmarked ? "tweet-action-bar__item--active" : ""
        }`}
      >
        <svg className="tweet-action-bar__svg" width="20" height="20" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span className="tweet-action-bar__count">{bookmarksCount}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          setShareOpen((value) => !value);
          setShareError(null);
          setShareNotice(null);
        }}
        className="tweet-action-bar__item tweet-action-bar__item--share"
      >
        <svg className="tweet-action-bar__svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
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
          <button
            type="button"
            className="btn small"
            onClick={handleShareToDm}
            disabled={shareBusy}
          >
            {shareBusy ? t.dmSearching : t.shareToDm}
          </button>

          <button
            type="button"
            className="btn small"
            onClick={handleExternalShare}
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
