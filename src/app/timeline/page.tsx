import { cookies } from "next/headers";
import { TimelineFeedClient } from "@/components/content/timeline-feed-client";
import { TimelineSortTabs } from "@/components/content/timeline-sort-tabs";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface TimelinePageData {
  posts: Array<{
    id: string;
    title: string;
    slug: string | null;
    excerpt: string | null;
    content?: string | null;
    coverImageUrl?: string | null;
    createdAt: string;
    updatedAt?: string;
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
  }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

type SortMode = "latest" | "smart";

async function loadData(sortMode: SortMode) {
  try {
    return {
      data: await apiGet<TimelinePageData>(
        `/api/timeline?page=1&limit=5&sort=${sortMode}`
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل بيانات الموجز.",
    };
  }
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const savedSort = cookieStore.get("timeline_sort")?.value;
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  const sortMode: SortMode =
    params.sort === "smart" || params.sort === "latest"
      ? params.sort
      : savedSort === "smart" || savedSort === "latest"
        ? savedSort
        : "latest";

  const { data, error } = await loadData(sortMode);

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={locale === "en" ? "Failed to load timeline" : "تعذر تحميل الموجز"}
            description={
              error ??
              (locale === "en"
                ? "Failed to load timeline data."
                : "تعذر تحميل بيانات الموجز.")
            }
          />
        </section>
      </AppShell>
    );
  }

  const posts = data.posts ?? [];
  const hasMore = Boolean(data.pagination?.hasMore);

  return (
    <AppShell>
      <section className="page-section timeline-top-tabs-wrap">
        <div className="timeline-top-tabs">
          <TimelineSortTabs sortMode={sortMode} locale={locale} />
        </div>
      </section>

      <section className="page-section" style={{ paddingTop: "10px" }}>
        <TimelineFeedClient
          initialPosts={posts}
          initialHasMore={hasMore}
          sortMode={sortMode}
          pageSize={5}
          locale={locale}
        />
      </section>
    </AppShell>
  );
}
