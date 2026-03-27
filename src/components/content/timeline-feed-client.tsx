"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { TimelineList } from "@/components/content/timeline-list";

interface TimelineFeedPost {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  createdAt: string;
  commentsCount: number;
  likesCount?: number;
  repostsCount?: number;
  bookmarksCount?: number;
  viewsCount?: number;
  category: { id: string; name: string; slug: string } | null;
  source: { id: string; name: string; slug: string } | null;
  author: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatarUrl?: string | null;
    isFollowing?: boolean;
    isOwnProfile?: boolean;
  } | null;
  repostOfPost?: {
    id: string;
    title: string;
    slug: string | null;
    author: { id: string; username: string } | null;
  } | null;
  quotedPost?: {
    id: string;
    title: string;
    slug: string | null;
    author: { id: string; username: string } | null;
  } | null;
  metadata?: {
    ingestion?: {
      originalUrl?: string | null;
    };
    social?: {
      postKind?: string;
      hashtags?: string[];
      mediaType?: "image" | "video" | null;
      mediaUrl?: string | null;
    };
  } | null;
}

interface TimelineFeedClientProps {
  initialPosts: TimelineFeedPost[];
  initialHasMore: boolean;
  sortMode: "latest" | "smart";
  pageSize?: number;
  locale?: "ar" | "en";
}

interface TimelineApiResponse {
  posts: TimelineFeedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const copy = {
  ar: {
    empty: "لا توجد منشورات لعرضها الآن.",
    loading: "جارٍ تحميل المزيد...",
    end: "وصلت إلى آخر التايملاين.",
    loadMore: "تحميل المزيد",
  },
  en: {
    empty: "No posts to show right now.",
    loading: "Loading more...",
    end: "You reached the end of the timeline.",
    loadMore: "Load more",
  },
} as const;

export function TimelineFeedClient({
  initialPosts,
  initialHasMore,
  sortMode,
  pageSize = 5,
  locale = "ar",
}: TimelineFeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const loadingGuardRef = useRef(false);
  const t = copy[locale];

  useEffect(() => {
    setPosts(initialPosts);
    setPage(1);
    setHasMore(initialHasMore);
    loadingGuardRef.current = false;
    setIsLoadingMore(false);
  }, [initialPosts, initialHasMore, sortMode]);

  const loadMore = async () => {
    if (loadingGuardRef.current || isPending || !hasMore) return;

    loadingGuardRef.current = true;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/timeline?page=${nextPage}&limit=${pageSize}&sort=${sortMode}`,
          { credentials: "include", cache: "no-store" }
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) return;

        const data = payload.data as TimelineApiResponse;

        setPosts((current) => {
          const seen = new Set(current.map((item) => item.id));
          const incoming = data.posts.filter((item) => !seen.has(item.id));
          return [...current, ...incoming];
        });

        setPage(nextPage);
        setHasMore(Boolean(data.pagination?.hasMore));
      } finally {
        loadingGuardRef.current = false;
        setIsLoadingMore(false);
      }
    });
  };

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "260px 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [page, hasMore, sortMode, isPending]);

  const empty = useMemo(() => posts.length === 0, [posts.length]);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {empty ? (
        <div className="state-card" style={{ margin: 0, maxWidth: "100%" }}>
          {t.empty}
        </div>
      ) : (
        <TimelineList posts={posts} locale={locale} />
      )}

      <div ref={sentinelRef} style={{ height: "1px" }} />

      {isLoadingMore ? (
        <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "14px", padding: "6px 0 8px" }}>
          {t.loading}
        </div>
      ) : null}

      {!isLoadingMore && hasMore ? (
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
          <button type="button" className="btn small" onClick={loadMore} disabled={isPending}>
            {t.loadMore}
          </button>
        </div>
      ) : null}

      {!hasMore && posts.length > 0 ? (
        <div style={{ textAlign: "center", color: "var(--muted)", fontSize: "14px", paddingBottom: "12px" }}>
          {t.end}
        </div>
      ) : null}
    </div>
  );
}
