import Link from "next/link";
import { cookies } from "next/headers";
import { SectionHeading } from "@/components/content/section-heading";
import { TimelineFeedClient } from "@/components/content/timeline-feed-client";
import { TimelineSortTabs } from "@/components/content/timeline-sort-tabs";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { normalizeUiLocale, uiCopy, type UiLocale } from "@/lib/ui-copy";
import { apiGet } from "@/lib/web-api";

interface HomeTimelineData {
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

interface CurrentUserLocaleData {
  user: {
    id: string;
    username: string;
    profile: {
      locale: string | null;
    } | null;
  };
}

type SortMode = "latest" | "smart";

async function getCurrentUser(): Promise<CurrentUserLocaleData["user"] | null> {
  try {
    const currentUser = await apiGet<CurrentUserLocaleData>("/api/auth/me");
    return currentUser.user;
  } catch {
    return null;
  }
}

async function loadHomeTimeline(sortMode: SortMode) {
  try {
    return {
      data: await apiGet<HomeTimelineData>(
        `/api/posts?sort=${sortMode}&page=1&limit=6`
      ),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "تعذر تحميل الصفحة الرئيسية.",
    };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const savedSort = cookieStore.get("timeline_sort")?.value;
  const currentUser = await getCurrentUser();
  const locale: UiLocale = normalizeUiLocale(currentUser?.profile?.locale);
  const copy = uiCopy[locale];

  const sortMode: SortMode =
    params.sort === "smart" || params.sort === "latest"
      ? params.sort
      : savedSort === "smart" || savedSort === "latest"
        ? savedSort
        : "latest";

  const { data, error } = await loadHomeTimeline(sortMode);

  if (error || !data) {
    return (
      <AppShell>
        <section className="page-section">
          <ErrorState
            title={
              locale === "en" ? "Unable to load home" : "تعذر تحميل الصفحة الرئيسية"
            }
            description={
              error ??
              (locale === "en"
                ? "Unable to load home."
                : "تعذر تحميل الصفحة الرئيسية.")
            }
          />
        </section>
      </AppShell>
    );
  }

  const posts = data.posts ?? [];
  const hasMore = Boolean(data.pagination?.hasMore);
  const badge = sortMode === "smart" ? copy.smartSort : copy.latestSort;

  return (
    <AppShell>
      <section className="page-section">
        <div
          style={{
            marginBottom: "20px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
            backdropFilter: "blur(8px)",
            display: "grid",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
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
              {badge}
            </span>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <Link href="/media" className="btn small">
                {copy.media}
              </Link>
              <Link href="/search" className="btn small">
                {copy.search}
              </Link>
              <Link href="/messages" className="btn small">
                {copy.messages}
              </Link>
            </div>
          </div>

          <SectionHeading
            eyebrow={copy.homeEyebrow}
            title={copy.homeTitle}
            description={copy.homeDescription}
          />

          <div
            className="state-card"
            style={{
              maxWidth: "100%",
              margin: 0,
              padding: "16px",
              display: "grid",
              gap: "10px",
            }}
          >
            <strong>{copy.quickSummary}</strong>
            <p style={{ margin: 0 }}>{copy.homeQuickSummary}</p>
          </div>

          {currentUser ? (
            <div
              className="state-card"
              style={{
                maxWidth: "100%",
                margin: 0,
                padding: "16px",
                display: "grid",
                gap: "12px",
              }}
            >
              <strong>{copy.quickActions}</strong>
              <p style={{ margin: 0 }}>{copy.quickActionsDescription}</p>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <Link href={`/u/${currentUser.username}`} className="btn small">
                  {copy.myPublicProfile}
                </Link>
                <Link href="/messages" className="btn small">
                  {copy.myMessages}
                </Link>
                <Link href="/dashboard/settings" className="btn small">
                  {copy.mySettings}
                </Link>
                <Link href="/dashboard" className="btn small">
                  {copy.openDashboard}
                </Link>
              </div>
            </div>
          ) : null}

          <TimelineSortTabs sortMode={sortMode} />
        </div>

        <TimelineFeedClient
          initialPosts={posts}
          initialHasMore={hasMore}
          sortMode={sortMode}
          pageSize={6}
        />
      </section>
    </AppShell>
  );
}
