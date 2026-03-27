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

const copy = {
  ar: {
    shareFailed: "تعذر تنفيذ المشاركة.",
  },
  en: {
    shareFailed: "Failed to share.",
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
  const t = copy[locale];

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

  async function handleShare() {
    const targetUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${href}`
        : href;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: targetUrl });
        setSharesCount((value) => value + 1);
        return;
      } catch {
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        setSharesCount((value) => value + 1);
      } catch {
        console.error(t.shareFailed);
      }
    }
  }

  return (
    <div
      className={`tweet-action-bar ${
        compact ? "tweet-action-bar--compact" : ""
      }`}
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
        onClick={handleShare}
        className="tweet-action-bar__item tweet-action-bar__item--share"
      >
        <span className="tweet-action-bar__icon">📤</span>
        {sharesCount > 0 ? (
          <span className="tweet-action-bar__count">{sharesCount}</span>
        ) : null}
      </button>
    </div>
  );
}
