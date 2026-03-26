"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineList } from "@/components/content/timeline-list";
import { EmptyState } from "@/components/ui/empty-state";

type SortMode = "latest" | "smart";

type PostItem = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  createdAt: string;
  commentsCount: number;
  likesCount?: number;
  category: { id: string; name: string; slug: string } | null;
  source: { id: string; name: string; slug: string } | null;
  author: { id: string; email: string; username: string } | null;
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
  } | null;
};

type Props = {
  initialPosts: PostItem[];
  initialHasMore: boolean;
  sortMode: SortMode;
};

export function TimelineFeedClient({
  initialPosts,
  initialHasMore,
  sortMode,
}: Props) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPosts(initialPosts);
    setPage(1);
    setHasMore(initialHasMore);
    setLoadingMore(false);
    setLoadError(null);
  }, [initialPosts, initialHasMore, sortMode]);

  const postIds = useMemo(() => new Set(posts.map((post) => post.id)), [posts]);

  async function loadMorePosts(nextPage: number) {
    const response = await fetch(
      `/api/posts?sort=${sortMode}&page=${nextPage}&limit=10`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message || "Failed to load more posts");
    }

    const incoming: PostItem[] = payload.data?.posts ?? [];
    const filtered = incoming.filter((post) => !postIds.has(post.id));

    setPosts((prev) => [...prev, ...filtered]);
    setPage(nextPage);
    setHasMore(Boolean(payload.data?.pagination?.hasMore));
  }

  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        observer.disconnect();
        setLoadingMore(true);
        setLoadError(null);

        try {
          await loadMorePosts(page + 1);
        } catch (error) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "تعذر تحميل المزيد من المنشورات."
          );
        } finally {
          setLoadingMore(false);
        }
      },
      {
        rootMargin: "300px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, postIds, sortMode]);

  if (posts.length === 0) {
    return (
      <EmptyState
        title="لا توجد منشورات"
        description="لا توجد منشورات متاحة في هذا النوع من الترتيب حاليًا."
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: "14px" }}>
      <div
        className="state-card"
        style={{
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <strong>عدد العناصر المعروضة الآن: {posts.length}</strong>
        <span style={{ color: "var(--muted)", fontSize: "14px" }}>
          {sortMode === "smart"
            ? "الوضع الحالي: الترتيب الذكي"
            : "الوضع الحالي: الأحدث أولًا"}
        </span>
      </div>

      <TimelineList posts={posts} />

      {loadError ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px solid rgba(239,68,68,0.22)",
            background: "rgba(239,68,68,0.08)",
            color: "#fecaca",
            fontSize: "14px",
            fontWeight: 600,
            display: "grid",
            gap: "10px",
          }}
        >
          <span>{loadError}</span>

          {hasMore ? (
            <button
              type="button"
              className="btn-action"
              onClick={async () => {
                setLoadingMore(true);
                setLoadError(null);

                try {
                  await loadMorePosts(page + 1);
                } catch (error) {
                  setLoadError(
                    error instanceof Error
                      ? error.message
                      : "تعذر تحميل المزيد من المنشورات."
                  );
                } finally {
                  setLoadingMore(false);
                }
              }}
            >
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : null}

      {hasMore ? (
        <div
          ref={sentinelRef}
          style={{
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.72)",
            fontSize: "14px",
            borderRadius: "14px",
          }}
        >
          {loadingMore ? "جاري تحميل المزيد..." : "مرر لأسفل لتحميل المزيد"}
        </div>
      ) : (
        <div
          style={{
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.58)",
            fontSize: "14px",
          }}
        >
          وصلت إلى نهاية الموجز
        </div>
      )}
    </div>
  );
}
