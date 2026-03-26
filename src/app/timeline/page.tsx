import { cookies } from "next/headers";
import { SectionHeading } from "@/components/content/section-heading";
import { TimelineFeedClient } from "@/components/content/timeline-feed-client";
import { TimelineSortTabs } from "@/components/content/timeline-sort-tabs";
import { AppHeader } from "@/components/layout/app-header";
import { ErrorState } from "@/components/ui/error-state";
import { apiGet } from "@/lib/web-api";

interface TimelinePageData {
  posts: Array<{
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
  }>;
  sortMode?: "latest" | "smart";
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
      data: await apiGet<TimelinePageData>(`/api/posts?sort=${sortMode}&page=1&limit=10`),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "تعذر تحميل بيانات الموجز.",
    };
  }
}

function getModeMeta(sortMode: SortMode) {
  if (sortMode === "smart") {
    return {
      badge: "الترتيب الذكي",
      title: "الموجز الذكي",
      description:
        "يعرض المنشورات حسب التفاعل والأولوية، وليس فقط حسب الوقت.",
    };
  }

  return {
    badge: "الأحدث أولًا",
    title: "الموجز الزمني",
    description: "يعرض أحدث المنشورات مباشرة بترتيب زمني واضح.",
  };
}

export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const savedSort = cookieStore.get("timeline_sort")?.value;

  const sortMode: SortMode =
    params.sort === "smart" || params.sort === "latest"
      ? params.sort
      : savedSort === "smart" || savedSort === "latest"
        ? savedSort
        : "latest";

  const { data, error } = await loadData(sortMode);
  const modeMeta = getModeMeta(sortMode);

  if (error || !data) {
    return (
      <main className="page-stack">
        <div className="page-container">
          <AppHeader />
          <ErrorState
            title="تعذر تحميل الموجز"
            description={error ?? "تعذر تحميل بيانات الموجز."}
          />
        </div>
      </main>
    );
  }

  const posts = data.posts ?? [];
  const hasMore = Boolean(data.pagination?.hasMore);

  return (
    <main className="page-stack">
      <div className="page-container">
        <AppHeader />

        <section className="page-section">
          <div
            style={{
              marginBottom: "20px",
              padding: "18px",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "18px",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#dbeafe",
                  background: "rgba(59,130,246,0.14)",
                  border: "1px solid rgba(59,130,246,0.28)",
                }}
              >
                {modeMeta.badge}
              </span>
            </div>

            <SectionHeading
              eyebrow="التايم لاين"
              title={modeMeta.title}
              description={modeMeta.description}
            />

            <TimelineSortTabs sortMode={sortMode} />
          </div>

          <TimelineFeedClient
            initialPosts={posts}
            initialHasMore={hasMore}
            sortMode={sortMode}
          />
        </section>
      </div>
    </main>
  );
}
