/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { apiGet } from "@/lib/web-api";
import { TimelineList } from "@/components/content/timeline-list";
import { PullToRefresh } from "@/components/navigation/pull-to-refresh";

type TimelinePost = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content?: string | null;
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
};

type TimelineResponse = {
  posts?: TimelinePost[];
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TimelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const mode = (params.mode as string) === "sources" ? "sources" : "people";
  const sort = (params.sort as string) ?? "latest";

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  let posts: TimelinePost[] = [];

  try {
    const data = await apiGet<TimelineResponse>(
      `/api/timeline?page=1&limit=50&sort=${encodeURIComponent(sort)}&mode=${encodeURIComponent(mode)}`
    );
    posts = Array.isArray(data?.posts) ? data.posts : [];
  } catch {
    posts = [];
  }

  return (
    <AppShell>
      <PullToRefresh locale={locale}>
        <section className="page-section" style={{ display: "grid", gap: 12 }}>
          <div className="state-card" style={{ padding: 12, display: "grid", gap: 10 }}>
            <div className="timeline-sort-tabs" style={{ minHeight: 0 }}>
              <Link
                href={`/timeline?mode=people&sort=${encodeURIComponent(sort)}`}
                className={`btn small ${mode === "people" ? "btn-action" : ""}`}
              >
                {locale === "en" ? "Waraq" : "ورق"}
              </Link>
              <Link
                href={`/timeline?mode=sources&sort=${encodeURIComponent(sort)}`}
                className={`btn small ${mode === "sources" ? "btn-action" : ""}`}
              >
                {locale === "en" ? "My Sources" : "مصادري"}
              </Link>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="state-card" style={{ padding: 16 }}>
              {locale === "en" ? "No posts found." : "لا توجد منشورات."}
            </div>
          ) : (
            <TimelineList posts={posts} />
          )}
        </section>
      </PullToRefresh>
    </AppShell>
  );
}
